/*
|==========================================================================
| zpress CLI
|==========================================================================
|
| CLI for building and serving documentation.
| Provides commands for sync, dev, build, and serve.
|
*/

// oxlint-disable-next-line import/no-unassigned-import -- side-effect: installs globalThis.require for ESM compat
import './shims/require.ts'
import { cli } from '@kidd-cli/core'

import build from './commands/build.ts'
import check from './commands/check.ts'
import cleanCmd from './commands/clean.ts'
import dev from './commands/dev.ts'
import diff from './commands/diff.ts'
import draft from './commands/draft.ts'
import dump from './commands/dump.ts'
import serve from './commands/serve.ts'
import setup from './commands/setup.ts'
import sync from './commands/sync.ts'
import { reportCrash, writeFatalToStderr } from './lib/crash-reporter.ts'
import { errorBoundary } from './middleware/error-boundary.ts'

declare const __KIDD_VERSION__: string

// ---------------------------------------------------------------------------
// Process-level safety net — catches async blowups outside the middleware chain
// ---------------------------------------------------------------------------

// oxlint-disable-next-line jest/require-hook -- CLI entry point, not a test file
process.on('uncaughtException', (error) => {
  handleProcessCrash({ error, source: 'uncaughtException' })
})

// oxlint-disable-next-line jest/require-hook -- CLI entry point, not a test file
process.on('unhandledRejection', (reason) => {
  handleProcessCrash({ error: reason, source: 'unhandledRejection' })
})

await cli({
  name: 'zpress',
  version: __KIDD_VERSION__,
  description: 'CLI for building and serving documentation',
  middleware: [errorBoundary()],
  commands: { build, check, clean: cleanCmd, dev, diff, draft, dump, serve, setup, sync },
  help: {
    order: ['setup', 'dev', 'build', 'serve', 'sync', 'check', 'diff', 'draft', 'clean', 'dump'],
  },
})

// ---------------------------------------------------------------------------

/**
 * Handle a process-level crash (uncaughtException / unhandledRejection).
 *
 * @private
 * @param params - The caught error and which process event caught it
 */
function handleProcessCrash(params: {
  readonly error: unknown
  readonly source: 'uncaughtException' | 'unhandledRejection'
}): void {
  const result = reportCrash({
    error: params.error,
    source: params.source,
    version: resolveVersion(),
  })

  writeFatalToStderr(result)
  process.exit(1)
}

/**
 * Resolve the CLI version string at runtime, falling back to 'unknown' if the
 * bundler constant is not available (e.g. in process-level crash handlers).
 *
 * @private
 * @returns The version string
 */
function resolveVersion(): string {
  if (typeof __KIDD_VERSION__ === 'string') {
    return __KIDD_VERSION__
  }
  return 'unknown'
}
