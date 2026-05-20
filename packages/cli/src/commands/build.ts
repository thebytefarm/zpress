import { command } from '@kidd-cli/core'
import { loadConfig } from '@zpress/config/loader'
import { z } from 'zod'

import { generateAssets } from '../lib/banner/index.ts'
import type { AssetConfig } from '../lib/banner/index.ts'
import { presentResults, runBuildCheck, runConfigCheck } from '../lib/check.ts'
import { createPaths } from '../lib/paths.ts'
import { buildSite } from '../lib/rspress.ts'
import { sync } from '../lib/sync/index.ts'
import { clean } from './clean.ts'

/**
 * Registers the `build` CLI command — the full production pipeline.
 *
 * Steps: clean (optional) → sync content → generate assets → build site.
 *
 * When `--check` is enabled (default), config validation and deadlink
 * detection run as part of the build. Use `--no-check` to skip checks
 * and build with standard (noisy) Rspress output.
 */
export default command({
  name: 'build',
  description: 'Sync content, generate assets, and build the site',
  options: z.object({
    quiet: z.boolean().optional().default(false),
    clean: z.boolean().optional().default(false),
    check: z.boolean().optional().default(true),
    verbose: z.boolean().optional().default(false),
  }),
  handler: async (ctx) => {
    const { quiet, check, verbose } = ctx.args
    const paths = createPaths(process.cwd())
    ctx.log.intro('zpress build')

    if (ctx.args.clean) {
      const removed = await clean(paths)
      if (removed.length > 0 && !quiet) {
        ctx.log.info(`Cleaned: ${removed.join(', ')}`)
      }
    }

    const [configErr, config] = await loadConfig(paths.repoRoot)
    if (configErr) {
      ctx.log.error(configErr.message)
      if (configErr.errors && configErr.errors.length > 0) {
        const details = configErr.errors
          .map((err) => `  ${err.path.join('.')}: ${err.message}`)
          .join('\n')
        ctx.log.error(details)
      }
      process.exit(1)
    }

    if (check) {
      // Checked build: validate config, sync, generate assets, then build+check
      ctx.log.step('Validating config...')
      const configResult = runConfigCheck({ config, loadError: configErr })

      ctx.log.step('Syncing content...')
      const syncResult = await sync(config, { paths, quiet: true })
      if (syncResult.error) {
        ctx.log.error(syncResult.error)
        process.exit(1)
      }

      await runAssetGeneration({ config, paths, log: ctx.log, quiet: true })

      ctx.log.step('Building & checking for broken links...')
      const buildResult = await runBuildCheck({ config, paths, verbose })

      const passed = presentResults({ configResult, buildResult, logger: ctx.log })
      if (!passed) {
        ctx.log.outro('Build failed')
        process.exit(1)
      }

      ctx.log.outro('Done')
    } else {
      // Unchecked build: sync + assets + build (no validation, noisy output)
      const uncheckedSyncResult = await sync(config, { paths, quiet })
      if (uncheckedSyncResult.error) {
        ctx.log.error(uncheckedSyncResult.error)
        process.exit(1)
      }
      await runAssetGeneration({ config, paths, log: ctx.log, quiet })
      await buildSite({ config, paths })
      ctx.log.outro('Done')
    }
  },
})

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build an `AssetConfig` from the loaded zpress config.
 * Returns `null` when no title is configured (nothing to generate).
 *
 * @private
 * @param config - Config object with optional title and tagline
 * @returns Asset config or null when no title is present
 */
function buildAssetConfig(config: {
  readonly title?: string
  readonly tagline?: string
}): AssetConfig | null {
  if (!config.title) {
    return null
  }
  return { title: config.title, tagline: config.tagline }
}

interface RunAssetGenerationParams {
  readonly config: { readonly title?: string; readonly tagline?: string }
  readonly paths: ReturnType<typeof createPaths>
  readonly log: { readonly step: (msg: string) => void; readonly info: (msg: string) => void }
  readonly quiet: boolean
}

/**
 * Generate branded SVG assets (banner, logo, icon) if a title is configured.
 *
 * @private
 * @param params - Config, paths, logger, and quiet flag
 */
async function runAssetGeneration(params: RunAssetGenerationParams): Promise<void> {
  const assetConfig = buildAssetConfig(params.config)
  if (!assetConfig) {
    return
  }

  if (!params.quiet) {
    params.log.step('Generating assets...')
  }

  const [assetErr, written] = await generateAssets({
    config: assetConfig,
    publicDir: params.paths.publicDir,
  })

  if (assetErr) {
    // Asset generation is non-fatal — log and continue
    params.log.info(`Asset generation skipped: ${assetErr.message}`)
    return
  }

  if (written.length > 0 && !params.quiet) {
    params.log.info(`Generated ${written.join(', ')}`)
  }
}
