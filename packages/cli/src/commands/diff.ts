import { execFileSync } from 'node:child_process'

import { command } from '@kidd-cli/core'
import { hasGlobChars, normalizeInclude } from '@zpress/config'
import type { Section, ZpressConfig, Result } from '@zpress/config'
import { loadConfig } from '@zpress/config/loader'
import { uniq } from 'es-toolkit'
import { match } from 'ts-pattern'
import { z } from 'zod'

import { createPaths } from '../lib/paths.ts'

const CONFIG_GLOBS = [
  'zpress.config.ts',
  'zpress.config.mts',
  'zpress.config.cts',
  'zpress.config.js',
  'zpress.config.mjs',
  'zpress.config.cjs',
  'zpress.config.json',
] as const

/**
 * Registers the `diff` CLI command to show changed files in watched directories.
 *
 * By default uses `git status` to detect uncommitted changes and outputs a
 * space-separated file list to stdout (suitable for lefthook, scripts, and piping).
 *
 * Use `--ref <ref>` to compare between commits instead of checking working tree
 * status. This uses `git diff --name-only <ref> HEAD` under the hood and exits
 * with code 1 when changes are detected — matching the Vercel `ignoreCommand`
 * convention (exit 1 = proceed with build, exit 0 = skip).
 *
 * @example
 * ```bash
 * # Detect uncommitted changes (default, uses git status)
 * zpress diff
 *
 * # Compare against parent commit (CI / Vercel ignoreCommand)
 * zpress diff --ref HEAD^
 *
 * # Compare against main branch (PR context)
 * zpress diff --ref main
 *
 * # Human-readable output
 * zpress diff --ref main --pretty
 * ```
 */
export default command({
  name: 'diff',
  description: 'Show changed files in configured source directories',
  options: z.object({
    pretty: z.boolean().optional().default(false),
    ref: z
      .string()
      .optional()
      .describe(
        'Git ref to compare against HEAD (e.g. HEAD^, main). Exits 1 when changes are detected.'
      ),
  }),
  handler: async (ctx) => {
    const { pretty, ref } = ctx.args
    const paths = createPaths(process.cwd())

    const [configErr, config] = await loadConfig(paths.repoRoot)
    if (configErr) {
      if (pretty) {
        ctx.log.intro('zpress diff')
        ctx.log.error(configErr.message)
        if (configErr.errors && configErr.errors.length > 0) {
          // oxlint-disable-next-line unicorn/no-array-for-each -- side-effect: logging each validation error
          configErr.errors.forEach((err) => {
            const p = err.path.join('.')
            ctx.log.error(`  ${p}: ${err.message}`)
          })
        }
      }
      process.exit(1)
    }

    const dirs = collectWatchPaths(config)

    if (dirs.length === 0) {
      if (pretty) {
        ctx.log.intro('zpress diff')
        ctx.log.warn('No source directories found in config')
        ctx.log.outro('Done')
      }
      return
    }

    const [gitErr, changed] = match(ref)
      .when(
        (r): r is string => r !== undefined,
        (r) => gitDiffFiles({ repoRoot: paths.repoRoot, dirs, ref: r })
      )
      .otherwise(() => gitChangedFiles({ repoRoot: paths.repoRoot, dirs }))

    if (gitErr) {
      if (pretty) {
        ctx.log.intro('zpress diff')
        ctx.log.error(`Git failed: ${gitErr.message}`)
        ctx.log.outro('Done')
      }
      process.exit(1)
    }

    if (changed.length === 0) {
      if (pretty) {
        ctx.log.intro('zpress diff')
        ctx.log.success('No changes detected')
        ctx.log.outro('Done')
      }
      return
    }

    if (pretty) {
      ctx.log.intro('zpress diff')
      ctx.log.step(`Watching ${dirs.length} path(s)`)
      ctx.log.note(changed.join('\n'), `${changed.length} changed file(s)`)
      ctx.log.outro('Done')
    } else {
      process.stdout.write(`${changed.join(' ')}\n`)
    }

    // When --ref is used (e.g. as a Vercel ignoreCommand), exit 1 signals
    // "changes detected, proceed with build". Exit 0 (no changes) means skip.
    if (ref) {
      process.exit(1)
    }
  },
})

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Collect unique directory paths from all section `include` fields in the config.
 *
 * @private
 * @param config - Resolved zpress config
 * @returns Deduplicated array of directory paths to watch
 */
function collectWatchPaths(config: ZpressConfig): readonly string[] {
  const dirs = flattenIncludePaths(config.sections).map(toDirectory)
  const roots = dirs.map(toTopLevelRoot).filter((r) => r.length > 0)
  return uniq([...dirs, ...roots, ...CONFIG_GLOBS])
}

/**
 * Recursively extract all `include` values from a section tree.
 *
 * @private
 * @param sections - Section tree to traverse
 * @returns Flat array of all `include` path strings
 */
function flattenIncludePaths(sections: readonly Section[]): readonly string[] {
  return sections.flatMap(flattenSection)
}

/**
 * Extract `include` paths from a single section, including nested items.
 *
 * @private
 * @param section - Section to extract include paths from
 * @returns Array of `include` path strings found in this section and its children
 */
function flattenSection(section: Section): readonly string[] {
  const includes = normalizeInclude(section.include)
  if (includes.length > 0 && section.items) {
    return [...includes, ...flattenIncludePaths(section.items)]
  }
  if (includes.length > 0) {
    return includes
  }
  if (section.items) {
    return flattenIncludePaths(section.items)
  }
  return []
}

/**
 * Extract the directory portion from a path that may contain glob characters.
 *
 * @private
 * @param from - A path or glob pattern (e.g. `docs/guides/*.md`)
 * @returns The directory portion (e.g. `docs/guides`)
 */
function toDirectory(from: string): string {
  if (hasGlobChars(from)) {
    const normalized = from.replaceAll('\\', '/')
    const segments = normalized.split('/')
    const dirSegments = segments.filter((s) => !hasGlobChars(s))
    return dirSegments.join('/') || '.'
  }
  return from
}

/**
 * Extract the top-level root directory from a path (the first segment).
 *
 * For example, `docs/getting-started` → `docs/`, `packages/cli` → `packages/`.
 * This ensures that sibling directories (e.g. asset folders) within the same
 * root are also watched for changes.
 *
 * @private
 * @param dir - A directory path
 * @returns The top-level root directory with trailing slash, or empty string for root paths
 */
function toTopLevelRoot(dir: string): string {
  const idx = dir.indexOf('/')
  if (idx === -1) {
    return ''
  }
  return dir.slice(0, idx + 1)
}

/**
 * Separator used by `git status --short` for renamed/copied entries.
 *
 * @private
 */
const RENAME_SEPARATOR = ' -> '

/**
 * Run `git status --short` scoped to the given directories and return changed file paths.
 *
 * @private
 * @param params - Parameters for the git status query
 * @param params.repoRoot - Absolute path to the repo root
 * @param params.dirs - Directories to scope the git status to
 * @returns Result tuple with changed file paths (repo-relative) or an error
 */
function gitChangedFiles(params: {
  readonly repoRoot: string
  readonly dirs: readonly string[]
}): Result<readonly string[]> {
  const [err, output] = execSilent({
    file: 'git',
    args: ['status', '--short', '--', ...params.dirs],
    cwd: params.repoRoot,
  })
  if (err) {
    return [err, null]
  }
  if (!output) {
    return [null, []]
  }
  const files = output
    .split('\n')
    .filter((line) => line.length > 0)
    .map(parseStatusLine)
    .filter((p) => p.length > 0)
  return [null, files]
}

/**
 * Extract the file path from a single `git status --short` output line.
 *
 * Format: `XY <path>` or `XY <old> -> <new>` for renames/copies.
 * The status prefix is always 3 characters (2 status chars + 1 space).
 *
 * @private
 * @param line - A single line from git status --short output
 * @returns The extracted file path (new path for renames)
 */
function parseStatusLine(line: string): string {
  const filePart = line.slice(3)
  const renameIdx = filePart.indexOf(RENAME_SEPARATOR)
  if (renameIdx !== -1) {
    return stripQuotes(filePart.slice(renameIdx + RENAME_SEPARATOR.length))
  }
  return stripQuotes(filePart)
}

/**
 * Remove surrounding double quotes from a git path if present.
 *
 * Git quotes paths containing spaces or non-ASCII characters
 * (e.g. `"docs/my file.md"`). This strips those quotes.
 *
 * @private
 * @param value - A file path that may be surrounded by double quotes
 * @returns The unquoted, trimmed path
 */
function stripQuotes(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Run `git diff --name-only <ref> HEAD` scoped to the given directories and return changed file paths.
 *
 * Use this instead of `gitChangedFiles` when comparing between commits (e.g. for
 * CI ignore commands like Vercel's `ignoreCommand`), since `git status` only
 * detects uncommitted changes and always returns empty on clean checkouts.
 *
 * @private
 * @param params - Parameters for the git diff query
 * @param params.repoRoot - Absolute path to the repo root
 * @param params.dirs - Directories to scope the git diff to
 * @param params.ref - Git ref to compare against HEAD (e.g. `HEAD^`, `main`)
 * @returns Result tuple with changed file paths (repo-relative) or an error
 */
function gitDiffFiles(params: {
  readonly repoRoot: string
  readonly dirs: readonly string[]
  readonly ref: string
}): Result<readonly string[]> {
  const [err, output] = execSilent({
    file: 'git',
    args: ['diff', '--name-only', params.ref, 'HEAD', '--', ...params.dirs],
    cwd: params.repoRoot,
  })
  if (err) {
    return [err, null]
  }
  if (!output) {
    return [null, []]
  }
  const files = output.split('\n').filter((line) => line.length > 0)
  return [null, files]
}

/**
 * Run a command silently with an explicit argument array, returning a Result
 * tuple with trimmed stdout on success or an Error on failure.
 *
 * @private
 * @param params - Parameters for the command execution
 * @param params.file - Executable to run
 * @param params.args - Arguments to pass to the executable
 * @param params.cwd - Working directory for the command
 * @returns Result tuple with trimmed stdout or an error
 */
function execSilent(params: {
  readonly file: string
  readonly args: readonly string[]
  readonly cwd: string
}): Result<string> {
  try {
    const output = execFileSync(params.file, [...params.args], {
      cwd: params.cwd,
      stdio: 'pipe',
      encoding: 'utf8',
    }).trimEnd()
    return [null, output]
  } catch (error) {
    // See https://github.com/joggrdocs/zpress/issues/73 — replace with shared toError util
    if (error instanceof Error) {
      return [error, null]
    }
    return [new Error(String(error)), null]
  }
}
