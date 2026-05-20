/**
 * Shared check orchestration for config validation and deadlink detection.
 *
 * This module is the CLI-level boundary for side effects: it intercepts
 * process.stderr to capture Rspress's `remarkLink` diagnostics and
 * presents structured results via the CLI logger. Mutation of process
 * state is confined here (like `watcher.ts`) and disabled from lint.
 */

import path from 'node:path'

import type { Log } from '@kidd-cli/core'
import { configError } from '@zpress/config'
import type { ConfigError, ConfigWarning, ZpressConfig } from '@zpress/config'
import { toError } from 'massaman/conversion'

import type { Paths } from './paths.ts'
import { buildSiteForCheck } from './rspress.ts'
import { checkWorkspaceIncludes } from './sync/workspace.ts'

// oxlint-disable-next-line prefer-regex-literals, no-control-regex -- regex literal is clearer for a well-known ANSI escape pattern
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g

const RED = '\u001B[31m'
const YELLOW = '\u001B[33m'
const DIM = '\u001B[2m'
const RESET = '\u001B[0m'

interface DeadlinkInfo {
  readonly file: string
  readonly links: readonly string[]
}

interface ConfigCheckResult {
  readonly passed: boolean
  readonly errors: readonly ConfigError[]
  readonly warnings: readonly ConfigWarning[]
}

type BuildCheckResult =
  | { readonly status: 'passed' }
  | { readonly status: 'failed'; readonly deadlinks: readonly DeadlinkInfo[] }
  | { readonly status: 'skipped' }
  | { readonly status: 'error'; readonly message: string }

interface CaptureResult<T> {
  readonly result: T | null
  readonly error: Error | null
  readonly captured: string
}

interface PresentResultsParams {
  readonly configResult: ConfigCheckResult
  readonly buildResult: BuildCheckResult
  readonly logger: Log
}

interface RunBuildCheckParams {
  readonly config: ZpressConfig
  readonly paths: Paths
  readonly verbose?: boolean
}

interface RunConfigCheckParams {
  readonly config: ZpressConfig | null
  readonly loadError: ConfigError | null
}

/**
 * Wrap a config load result into a structured check result.
 *
 * `loadConfig` already validates via `validateConfig` and returns a
 * `ConfigResult` tuple. This function translates that into the
 * `ConfigCheckResult` shape used by the presentation layer.
 *
 * @param params - The loaded config and any load error
 * @returns A `ConfigCheckResult` with pass/fail status and any errors
 */
export function runConfigCheck(params: RunConfigCheckParams): ConfigCheckResult {
  const { config, loadError } = params
  if (loadError) {
    return { passed: false, errors: [loadError], warnings: [] }
  }
  if (!config) {
    return {
      passed: false,
      errors: [configError('empty_sections', 'Config is missing')],
      warnings: [],
    }
  }
  const warnings = checkWorkspaceIncludes(config)
  return { passed: true, errors: [], warnings }
}

/**
 * Run a silent Rspress build to detect deadlinks.
 *
 * Rspress's `remarkLink` plugin checks internal links during build. In
 * production mode it logs colored error messages per file via `logger.error()`
 * then throws `Error("Dead link found")`. We capture stderr to parse the
 * diagnostics and present them in our own clean format.
 *
 * @param params - Config and paths for the build
 * @returns A `BuildCheckResult` with pass/fail status and any deadlinks found
 */
export async function runBuildCheck(params: RunBuildCheckParams): Promise<BuildCheckResult> {
  if (params.verbose) {
    return runBuildCheckVerbose(params)
  }

  const { error, captured } = await captureOutput(() =>
    buildSiteForCheck({ config: params.config, paths: params.paths })
  )

  // Rspress wraps the "Dead link found" error inside an Rspack build failure,
  // so we check captured output for deadlink patterns rather than the error message.
  if (error) {
    const { repoRoot } = params.paths
    const deadlinks = parseDeadlinks(captured).map((info) => ({
      file: path.relative(repoRoot, info.file),
      links: info.links,
    }))
    if (deadlinks.length > 0) {
      return { status: 'failed', deadlinks }
    }

    // Non-deadlink build error — surface as a generic failure
    return { status: 'error', message: error.message }
  }

  return { status: 'passed' }
}

/**
 * Format and display check results using the CLI logger.
 *
 * @param params - Config check result, build check result, and logger instance
 * @returns `true` if all checks passed, `false` otherwise
 */
export function presentResults(params: PresentResultsParams): boolean {
  const { configResult, buildResult, logger } = params

  if (configResult.passed) {
    logger.success('Config valid')
  } else {
    logger.error('Config validation failed:')
    // oxlint-disable-next-line no-unused-expressions -- side-effect logging over config errors
    configResult.errors.map((err) => {
      logger.message(`  ${err.message}`)
      return null
    })
  }

  if (configResult.warnings.length > 0) {
    logger.warn(`${configResult.warnings.length} config warning(s):`)
    // oxlint-disable-next-line no-unused-expressions -- side-effect logging over config warnings
    configResult.warnings.map((w) => {
      logger.message(`  ${YELLOW}⚠${RESET} ${w.message}`)
      return null
    })
  }

  if (buildResult.status === 'passed') {
    logger.success('No broken links')
  } else if (buildResult.status === 'skipped') {
    // Build was skipped (e.g. config invalid) — nothing to report
  } else if (buildResult.status === 'error') {
    logger.error(`Build failed: ${buildResult.message}`)
  } else {
    const totalLinks = buildResult.deadlinks.reduce((sum, info) => sum + info.links.length, 0)
    logger.error(`Found ${totalLinks} broken link(s):`)
    const block = buildResult.deadlinks.map(formatDeadlinkGroup).join('\n')
    logger.message(block)
  }

  return configResult.passed && buildResult.status === 'passed'
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Run the build check without capturing output, letting Rspress/Rspack
 * write directly to stdout/stderr so the full error details are visible.
 *
 * @private
 * @param params - Config and paths for the build
 * @returns A `BuildCheckResult` with pass/fail status
 */
async function runBuildCheckVerbose(params: RunBuildCheckParams): Promise<BuildCheckResult> {
  try {
    await buildSiteForCheck({ config: params.config, paths: params.paths })
    return { status: 'passed' }
  } catch (error) {
    return { status: 'error', message: toError(error).message }
  }
}

/**
 * Strip ANSI escape codes from a string.
 *
 * @private
 * @param text - Text potentially containing ANSI color codes
 * @returns The text with all ANSI escape sequences removed
 */
function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

/**
 * Coerce a chunk to a UTF-8 string.
 *
 * @private
 * @param chunk - Buffer or string from a writable stream
 * @returns UTF-8 string representation
 */
function chunkToString(chunk: Uint8Array | string): string {
  if (typeof chunk === 'string') {
    return chunk
  }
  return Buffer.from(chunk).toString('utf8')
}

/**
 * Create an interceptor that captures writes and swallows them.
 *
 * Invokes any callback passed via Node's overloaded `write` signature
 * so callers that rely on write-completion callbacks are not left hanging.
 *
 * @private
 * @param chunks - Mutable array to accumulate captured text
 * @returns Interceptor function matching the `process.stdout.write` signature
 */
function createInterceptor(chunks: string[]): typeof process.stdout.write {
  return function interceptWrite(
    chunk: Uint8Array | string,
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- matching Node's overloaded write signature
    encodingOrCb?: any,
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- matching Node's overloaded write signature
    maybeCb?: any
  ): boolean {
    const text = chunkToString(chunk)
    // oxlint-disable-next-line functional/immutable-data -- accumulating captured output
    chunks.push(text)
    // Invoke callback if provided (matches Node's write signature overloads)
    if (typeof encodingOrCb === 'function') {
      // oxlint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks -- invoking Node's write callback, not an async pattern
      encodingOrCb()
    } else if (typeof maybeCb === 'function') {
      // oxlint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks -- invoking Node's write callback, not an async pattern
      maybeCb()
    }
    return true
  } as typeof process.stdout.write
}

/**
 * Execute an async function while capturing all stdout and stderr output.
 *
 * Temporarily replaces both `process.stdout.write` and `process.stderr.write`
 * to intercept output from Rspress/Rsbuild. The Rsbuild logger writes
 * deadlink diagnostics to stdout (not stderr), so we must capture both
 * streams. All output is swallowed — the check command presents its own
 * clean results. Original write functions are always restored.
 *
 * @private
 * @param fn - The async function to execute while capturing output
 * @returns The function result (or null on error), any thrown error, and captured output text
 */
async function captureOutput<T>(fn: () => Promise<T>): Promise<CaptureResult<T>> {
  const chunks: string[] = []
  const originalStdoutWrite = process.stdout.write
  const originalStderrWrite = process.stderr.write

  // oxlint-disable-next-line functional/immutable-data -- boundary mutation: intercepting stdout for build output capture
  process.stdout.write = createInterceptor(chunks)
  // oxlint-disable-next-line functional/immutable-data -- boundary mutation: intercepting stderr for build output capture
  process.stderr.write = createInterceptor(chunks)

  try {
    const result = await fn()
    return { result, error: null, captured: chunks.join('') }
  } catch (error) {
    return { result: null, error: toError(error), captured: chunks.join('') }
  } finally {
    // oxlint-disable-next-line functional/immutable-data -- restoring original stdout.write
    process.stdout.write = originalStdoutWrite
    // oxlint-disable-next-line functional/immutable-data -- restoring original stderr.write
    process.stderr.write = originalStderrWrite
  }
}

/**
 * Flush accumulated deadlink state into a result entry if present.
 *
 * @private
 * @param results - Accumulated deadlink results so far
 * @param file - Current file being parsed, or null
 * @param links - Links accumulated for the current file
 * @returns Updated results array with the current group appended if non-empty
 */
function flushGroup(
  results: readonly DeadlinkInfo[],
  file: string | null,
  links: readonly string[]
): readonly DeadlinkInfo[] {
  if (file && links.length > 0) {
    return [...results, { file, links }]
  }
  return results
}

/**
 * Parse Rspress's `remarkLink` deadlink output from captured stderr.
 *
 * The format (after ANSI stripping) is:
 * ```
 * Dead links found in /path/to/file.mdx:
 *   "[..](/invalid-path)" /resolved/path
 *   "[..](/another-bad)" /resolved/path
 * ```
 *
 * @private
 * @param stderr - Raw captured stderr text (may contain ANSI codes)
 * @returns Array of `DeadlinkInfo` grouped by file
 */
function parseDeadlinks(stderr: string): readonly DeadlinkInfo[] {
  const clean = stripAnsi(stderr)
  const lines = clean.split('\n')

  // Rsbuild logger may prefix lines with "error   " or other labels + ANSI codes.
  // Match loosely: any line containing "Dead links found in <path>:"
  // oxlint-disable-next-line prefer-regex-literals -- regex literal is clearer for this pattern
  const headerPattern = /Dead links found in (.+?):\s*$/
  // Match loosely: any line containing "[..](/some-link)"
  // oxlint-disable-next-line prefer-regex-literals -- regex literal is clearer for this pattern
  const linkPattern = /"\[\.\.]\(([^)]+)\)"/

  /* oxlint-disable no-accumulating-spread -- small bounded input (deadlink stderr lines); clarity over perf here */
  const acc = lines.reduce<{
    readonly results: readonly DeadlinkInfo[]
    readonly currentFile: string | null
    readonly currentLinks: readonly string[]
  }>(
    (state, line) => {
      const headerMatch = headerPattern.exec(line)
      if (headerMatch) {
        const file = headerMatch[1] ?? ''
        return {
          results: flushGroup(state.results, state.currentFile, state.currentLinks),
          currentFile: file,
          currentLinks: [],
        }
      }

      const linkMatch = linkPattern.exec(line)
      if (linkMatch && state.currentFile) {
        const link = linkMatch[1] ?? ''
        return { ...state, currentLinks: [...state.currentLinks, link] }
      }

      return state
    },
    { results: [], currentFile: null, currentLinks: [] }
  )
  /* oxlint-enable no-accumulating-spread */

  return flushGroup(acc.results, acc.currentFile, acc.currentLinks)
}

/**
 * Format a single deadlink group as a compact multi-line string.
 *
 * Output resembles linting output:
 * ```
 *   ✖ .zpress/content/getting-started.md
 *       → /this-does-not-exist
 *       → /another/bad-link
 * ```
 *
 * @private
 * @param info - Deadlink info with file path and broken links
 * @returns Formatted multi-line string for CLI output
 */
function formatDeadlinkGroup(info: DeadlinkInfo): string {
  const header = `  ${RED}✖${RESET} ${info.file}`
  const links = info.links.map((link) => `      ${DIM}→${RESET} ${link}`)
  return [header, ...links].join('\n')
}
