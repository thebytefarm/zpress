import { command } from '@kidd-cli/core'
import { loadConfig } from '@zpress/config/loader'
import { z } from 'zod'

import { createPaths } from '../lib/paths.ts'
import { sync } from '../lib/sync/index.ts'

/**
 * Registers the `sync` CLI command — runs the sync engine and exits.
 *
 * Loads config, syncs all content to `.zpress/content/`, and reports results.
 * Useful for CI pipelines and benchmarking where dev server or build is not needed.
 */
export default command({
  name: 'sync',
  description: 'Sync documentation content without building or starting dev server',
  options: z.object({
    quiet: z.boolean().optional().default(false),
  }),
  handler: async (ctx) => {
    const paths = createPaths(process.cwd())
    if (!ctx.args.quiet) {
      ctx.log.intro('zpress sync')
    }

    const [configErr, config] = await loadConfig(paths.repoRoot)
    if (configErr) {
      ctx.log.error(configErr.message)
      process.exit(1)
    }

    const result = await sync(config, { paths, quiet: ctx.args.quiet })
    if (result.error) {
      ctx.log.error(result.error)
      process.exit(1)
    }

    if (!ctx.args.quiet) {
      ctx.log.success(
        `${result.pagesWritten} written, ${result.pagesSkipped} unchanged, ${result.pagesRemoved} removed (${result.elapsed.toFixed(0)}ms)`
      )
    }

    if (!ctx.args.quiet) {
      ctx.log.outro('Done')
    }
  },
})
