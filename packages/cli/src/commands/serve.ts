import { command } from '@kidd-cli/core'
import { loadConfig } from '@zpress/config/loader'
import { z } from 'zod'

import { createPaths } from '../lib/paths.ts'
import { openBrowser, serveSite } from '../lib/rspress.ts'

/**
 * Registers the `serve` CLI command to preview a previously built site.
 */
export default command({
  name: 'serve',
  description: 'Preview the built Rspress site',
  options: z.object({
    open: z.boolean().optional().default(true),
    port: z.number().optional(),
    theme: z.string().optional(),
    colorMode: z.enum(['dark', 'light']).optional(),
    vscode: z.boolean().optional().default(false),
  }),
  handler: async (ctx) => {
    ctx.log.intro('zpress serve')
    const paths = createPaths(process.cwd())
    const [configErr, config] = await loadConfig(paths.repoRoot)
    if (configErr) {
      ctx.log.error(configErr.message)
      if (configErr.errors && configErr.errors.length > 0) {
        configErr.errors.map((err) => {
          const path = err.path.join('.')
          return ctx.log.error(`  ${path}: ${err.message}`)
        })
      }
      process.exit(1)
    }

    const port = await serveSite({
      config,
      paths,
      port: ctx.args.port,
      theme: ctx.args.theme,
      colorMode: ctx.args.colorMode,
      vscode: ctx.args.vscode,
    })

    if (ctx.args.open) {
      openBrowser(`http://localhost:${port}`)
    }
  },
})
