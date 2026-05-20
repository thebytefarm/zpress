// Local-only: bypasses the Ink TUI in `zpress dev` so the server can run
// in a non-TTY background process. Not committed (gitignored / lint-ignored).
import { resolve } from 'node:path'

import { dev } from '@rspress/core'
import { loadConfig } from '@zpress/config/loader'
import { createRspressConfig } from '@zpress/ui/node'

// Workspace-internal imports — this script is local-only, not published.
import { createPaths } from '../cli/dist/index.mjs'
import { sync } from '../cli/dist/index.mjs'

const cwd = resolve(import.meta.dirname, '..', '..')
const [configErr, config] = await loadConfig(cwd)
if (configErr) {
  process.stderr.write(`config error: ${configErr.message}\n`)
  process.exit(1)
}
const paths = createPaths(cwd)
process.stdout.write('[headless] syncing content...\n')
const syncResult = await sync(config, { paths, quiet: true })
if (syncResult.error) {
  process.stderr.write(`sync error: ${syncResult.error}\n`)
  process.exit(1)
}
process.stdout.write(`[headless] sync ok (${syncResult.pagesWritten} written)\n`)
const rspressConfig = createRspressConfig({ config, paths, logLevel: 'info' })
process.stdout.write('[headless] starting rspress dev server...\n')
await dev({
  appDirectory: paths.repoRoot,
  docDirectory: paths.contentDir,
  config: rspressConfig,
  configFilePath: '',
  extraBuilderConfig: { server: { port: 6174, strictPort: false }, dev: { progressBar: false } },
})
process.stdout.write('[headless] dev server ready on http://localhost:6174\n')
await new Promise(() => {})
