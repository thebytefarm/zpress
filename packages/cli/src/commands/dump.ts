import { command } from '@kidd-cli/core'
import { loadConfig } from '@zpress/config/loader'

import { createPaths } from '../lib/paths.ts'
import { loadManifest } from '../lib/sync/manifest.ts'
import { resolveEntries } from '../lib/sync/resolve/index.ts'
import type { ResolvedEntry, SyncContext } from '../lib/sync/types.ts'

/**
 * Slim shape for JSON output — drops page data and keeps only the navigation tree.
 */
interface DumpEntry {
  readonly text: string
  readonly link?: string
  readonly collapsible?: boolean
  readonly hidden?: boolean
  readonly standalone?: boolean
  readonly items?: DumpEntry[]
}

/**
 * Registers the `dump` CLI command to resolve and print the full entry tree as JSON.
 *
 * @returns A CLI command that outputs the resolved entry tree as formatted JSON
 */
export default command({
  name: 'dump',
  description: 'Resolve and print the full entry tree as JSON',
  handler: async (ctx) => {
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
    const previousManifest = await loadManifest(paths.contentDir)

    const syncCtx: SyncContext = {
      repoRoot: paths.repoRoot,
      outDir: paths.contentDir,
      config,
      previousManifest,
      manifest: { files: {}, timestamp: Date.now() },
      quiet: true,
    }

    const [resolveErr, resolved] = await resolveEntries(config.sections, syncCtx)
    if (resolveErr) {
      ctx.log.error(resolveErr.message)
      process.exit(1)
    }
    const tree = toTree(resolved)
    process.stdout.write(`${JSON.stringify(tree, null, 2)}\n`)
  },
})

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Conditionally include a `link` property in the spread object.
 *
 * @private
 * @param link - Optional link string
 * @returns Object with `link` if defined, empty object otherwise
 */
function maybeLink(link: string | undefined): { readonly link: string } | Record<string, never> {
  if (link) {
    return { link }
  }
  return {}
}

/**
 * Conditionally include a `collapsible` property in the spread object.
 *
 * @private
 * @param collapsible - Optional collapsible flag
 * @returns Object with `collapsible` if truthy, empty object otherwise
 */
function maybeCollapsible(
  collapsible: boolean | undefined
): { readonly collapsible: boolean } | Record<string, never> {
  if (collapsible) {
    return { collapsible }
  }
  return {}
}

/**
 * Conditionally include a `hidden` property in the spread object.
 *
 * @private
 * @param hidden - Optional hidden flag
 * @returns Object with `hidden` if truthy, empty object otherwise
 */
function maybeHidden(
  hidden: boolean | undefined
): { readonly hidden: boolean } | Record<string, never> {
  if (hidden) {
    return { hidden }
  }
  return {}
}

/**
 * Conditionally include a `standalone` property in the spread object.
 *
 * @private
 * @param standalone - Optional standalone flag
 * @returns Object with `standalone` if truthy, empty object otherwise
 */
function maybeStandalone(
  standalone: boolean | undefined
): { readonly standalone: boolean } | Record<string, never> {
  if (standalone) {
    return { standalone }
  }
  return {}
}

/**
 * Conditionally include nested `items` by recursively converting child entries.
 *
 * @private
 * @param items - Optional resolved child entries
 * @returns Object with `items` if non-empty, empty object otherwise
 */
function maybeItems(
  items: readonly ResolvedEntry[] | undefined
): { readonly items: DumpEntry[] } | Record<string, never> {
  if (items && items.length > 0) {
    return { items: toTree(items) }
  }
  return {}
}

/**
 * Convert a list of resolved entries into a slim dump tree for JSON output.
 *
 * @private
 * @param entries - Resolved entries from the sync engine
 * @returns Array of slim dump entries
 */
function toTree(entries: readonly ResolvedEntry[]): DumpEntry[] {
  return entries.map(buildDumpEntry)
}

/**
 * Build a single dump entry from a resolved entry, spreading optional fields.
 *
 * @private
 * @param entry - Resolved entry to convert
 * @returns Slim dump entry for JSON serialization
 */
function buildDumpEntry(entry: ResolvedEntry): DumpEntry {
  return {
    text: entry.title,
    ...maybeLink(entry.link),
    ...maybeCollapsible(entry.collapsible),
    ...maybeHidden(entry.hidden),
    ...maybeStandalone(entry.standalone),
    ...maybeItems(entry.items as readonly ResolvedEntry[] | undefined),
  }
}
