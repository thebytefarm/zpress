import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, platform, version as nodeVersion } from 'node:process'

import { toError } from 'massaman/conversion'

/**
 * Source of the crash — where it was caught.
 */
export type CrashSource = 'middleware' | 'uncaughtException' | 'unhandledRejection'

/**
 * Options for reporting a crash.
 */
export interface CrashReportOptions {
  readonly error: unknown
  readonly source: CrashSource
  readonly command?: string
  readonly args?: Record<string, unknown>
  readonly version: string
}

/**
 * Result of a crash report attempt.
 *
 * - `ok: true` — log written successfully, `logPath` is the file path
 * - `ok: false` — log write failed, `error` describes why, `logPath` is null
 *
 * `message` is always the original error's message regardless of write outcome.
 */
export interface CrashResult {
  readonly ok: boolean
  readonly message: string
  readonly logPath: string | null
  readonly error: Error | null
}

/**
 * Write a fatal error message to stderr based on the crash result.
 *
 * @param result - The CrashResult from reportCrash
 */
export function writeFatalToStderr(result: CrashResult): void {
  if (result.ok) {
    process.stderr.write(`\n✖ Fatal Error: ${result.message}\n  Full log: ${result.logPath}\n\n`)
  } else {
    process.stderr.write(`\n✖ Fatal Error: ${result.message}\n\n`)
  }
}

/**
 * Report a fatal crash: build a structured report and write it to disk.
 *
 * @param options - Crash context including the caught error, source, and optional command info
 * @returns A CrashResult indicating whether the log was written and where
 */
export function reportCrash(options: CrashReportOptions): CrashResult {
  const normalized = toError(options.error)
  const report = buildReport({ error: normalized, options })
  return writeCrashLog({ report, message: normalized.message })
}

// ---------------------------------------------------------------------------

/**
 * Structured crash report written to disk as JSON.
 *
 * @private
 */
interface CrashReport {
  readonly timestamp: string
  readonly level: 'fatal'
  readonly source: CrashSource
  readonly command: string | null
  readonly args: Record<string, unknown> | null
  readonly error: {
    readonly name: string
    readonly message: string
    readonly stack: string | null
  }
  readonly env: {
    readonly node: string
    readonly platform: string
    readonly arch: string
    readonly zpress: string
  }
}

/**
 * Assemble a CrashReport from the normalized error and options.
 *
 * @private
 * @param params - The error and original crash report options
 * @returns A structured CrashReport object
 */
function buildReport(params: {
  readonly error: Error
  readonly options: CrashReportOptions
}): CrashReport {
  const { error, options } = params
  return {
    timestamp: new Date().toISOString(),
    level: 'fatal',
    source: options.source,
    command: options.command ?? null,
    args: options.args ?? null,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    },
    env: {
      node: nodeVersion,
      platform,
      arch,
      zpress: options.version,
    },
  }
}

/**
 * Write a crash report to a JSON file in the OS temp directory.
 *
 * Creates `<tmpdir>/zpress/` if it doesn't exist. Each crash gets a unique
 * filename based on the current timestamp and a random suffix.
 *
 * @private
 * @param params - The report to serialize and the original error message
 * @returns A CrashResult with the write outcome
 */
function writeCrashLog(params: {
  readonly report: CrashReport
  readonly message: string
}): CrashResult {
  const { report, message } = params
  try {
    const dir = join(tmpdir(), 'zpress')
    mkdirSync(dir, { recursive: true, mode: 0o700 })

    const timestamp = report.timestamp.replaceAll(/[:.]/g, '-')
    const filename = `error-${timestamp}-${randomUUID()}.log`
    const logPath = join(dir, filename)

    writeFileSync(logPath, JSON.stringify(report, null, 2), { encoding: 'utf8', mode: 0o600 })

    return { ok: true, message, logPath, error: null }
  } catch (error) {
    return { ok: false, message, logPath: null, error: toError(error) }
  }
}
