import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { log } from '@clack/prompts'
import type { Section, ZpressConfig } from '@zpress/config'
import { collectAllWorkspaceItems } from '@zpress/config'
import { match, P } from 'ts-pattern'

import { generateAssets } from '../banner/index.ts'
import type { AssetConfig } from '../banner/types.ts'
import type { Paths } from '../paths.ts'
import { copyPage } from './copy.ts'
import { buildWorkspaceData, generateDefaultHomePage } from './home.ts'
import { loadManifest, saveManifest, cleanStaleFiles } from './manifest.ts'
import type { OpenAPISidebarEntry } from './openapi.ts'
import { syncAllOpenAPI } from './openapi.ts'
import { discoverPlanningPages } from './planning.ts'
import { resolveEntries } from './resolve/index.ts'
import { buildSourceMap } from './rewrite-links.ts'
import { generateNav } from './sidebar/index.ts'
import { injectLandingPages } from './sidebar/inject.ts'
import { writeMetaFiles } from './sidebar/write-meta.ts'
import type { PageData, ResolvedEntry, SidebarItem, SyncContext } from './types.ts'
import { enrichWorkspaceCards, synthesizeWorkspaceSections } from './workspace.ts'

/**
 * Aggregate result from a completed sync pass.
 */
export interface SyncResult {
  readonly pagesWritten: number
  readonly pagesSkipped: number
  readonly pagesRemoved: number
  readonly elapsed: number
  /**
   * When set, the sync failed and this message describes why.
   * Callers should treat a non-null error as a hard failure.
   */
  readonly error?: string
}

export interface SyncOptions {
  /**
   * Resolved project paths.
   */
  readonly paths: Paths
  /**
   * When true, suppress all log output during sync.
   */
  readonly quiet?: boolean
  /**
   * Shared cache of dereferenced OpenAPI specs.
   * Persisted across sync passes in dev mode to avoid re-parsing unchanged specs.
   */
  readonly openapiCache?: Map<string, unknown>
}

/**
 * Run a full documentation sync from config to the output directory.
 *
 * Resolves sections, copies pages, generates sidebar/nav, syncs OpenAPI specs,
 * and manages the incremental manifest for change tracking.
 *
 * @param config - Validated zpress config
 * @param options - Sync options including resolved paths and quiet flag
 * @returns Sync result with counts of pages written, skipped, and removed
 */
export async function sync(config: ZpressConfig, options: SyncOptions): Promise<SyncResult> {
  const start = performance.now()
  const quiet = resolveQuiet(options.quiet)

  const { repoRoot, contentDir: outDir } = options.paths

  await fs.mkdir(outDir, { recursive: true })
  await fs.mkdir(path.resolve(outDir, '.generated'), { recursive: true })

  // Generate banner/logo/icon SVGs (skips user-customized files automatically)
  const assetConfig = buildAssetConfig(config)
  const assetConfigHash = createHash('sha256').update(JSON.stringify(assetConfig)).digest('hex')

  const previousManifest = await loadManifest(outDir)

  // Skip asset generation entirely when config hasn't changed
  const assetConfigChanged =
    previousManifest === null ||
    previousManifest === undefined ||
    previousManifest.assetConfigHash !== assetConfigHash
  if (assetConfigChanged) {
    await generateAssets({ config: assetConfig, publicDir: options.paths.publicDir })
  }

  // Copy public assets into content/public/ so Rspress can resolve them
  // (Rspress looks for public/ inside the root directory, which is .zpress/content/)
  await copyAll(options.paths.publicDir, path.resolve(outDir, 'public'))

  const ctx: SyncContext = {
    repoRoot,
    outDir,
    config,
    previousManifest,
    manifest: { files: {}, timestamp: Date.now() },
    quiet,
    openapiCache: options.openapiCache,
  }

  // 0. Synthesize workspace sections from apps/packages/workspaces config
  const workspaceSections = synthesizeWorkspaceSections(config)
  const allSections: Section[] = [...config.sections, ...workspaceSections]

  // 1. Resolve the section tree
  const [resolveErr, rawResolved] = await resolveEntries(allSections, ctx)
  if (resolveErr) {
    return {
      pagesWritten: 0,
      pagesSkipped: 0,
      pagesRemoved: 0,
      elapsed: performance.now() - start,
      error: resolveErr.message,
    }
  }

  // 1.25 Enrich sections with workspace card metadata from workspaces config
  const resolved = enrichWorkspaceCards(rawResolved, config)

  // 1.5 Inject auto-generated landing pages for sections with path but no page
  const workspaces = collectAllWorkspaceItems(config)
  injectLandingPages(resolved, allSections, workspaces)

  // 2. Collect all pages from the tree
  const sectionPages = collectPages(resolved)

  // 2.1 Write workspace data (always — independent of home page strategy)
  const workspaceResult = buildWorkspaceData(config)
  const sectionScopePaths = collectStandaloneScopePaths(resolved)
  await fs.writeFile(
    path.resolve(outDir, '.generated/workspaces.json'),
    JSON.stringify(workspaceResult.data, null, 2),
    'utf8'
  )

  // 2.2 Auto-generate home page when no explicit index.md exists
  const hasExplicitHome = sectionPages.some((p) => p.outputPath === 'index.md')
  const homeResult = await match(hasExplicitHome)
    .with(true, () => Promise.resolve(null))
    .otherwise(() => generateDefaultHomePage(config, repoRoot))

  const pages: PageData[] = match(homeResult)
    .with(P.nonNullable, (result) => [
      ...sectionPages,
      {
        content: result.content,
        outputPath: 'index.md',
        frontmatter: {},
      } satisfies PageData,
    ])
    .otherwise(() => sectionPages)

  // 2.5 Discover planning pages (hidden — not in sidebar/nav)
  const planningPages = await discoverPlanningPages(ctx)

  // 2.6 Sync OpenAPI specs
  const openapiResult = await syncAllOpenAPI(ctx)

  // 2.7 Write scopes.json — section standalone scopes + root-level OpenAPI scopes
  const openapiScopePaths = collectOpenapiScopePaths(openapiResult.sidebar)
  const standaloneScopePaths = [...sectionScopePaths, ...openapiScopePaths]
  await fs.writeFile(
    path.resolve(outDir, '.generated/scopes.json'),
    JSON.stringify(standaloneScopePaths, null, 2),
    'utf8'
  )

  // 3. Copy/generate all pages (sections + home + planning + openapi)
  const allPages = [...pages, ...planningPages, ...openapiResult.pages]

  // Detect structural changes — skip mtime optimization when page count changes
  const skipMtimeOptimization =
    previousManifest !== null &&
    previousManifest !== undefined &&
    allPages.length !== previousManifest.resolvedCount

  // Build source-to-output map for link rewriting
  const sourceMap = buildSourceMap({ pages: allPages, repoRoot })
  const copyCtx: SyncContext = { ...ctx, sourceMap, skipMtimeOptimization }

  const pageResults = await Promise.all(
    allPages.map(async (page) => {
      const entry = await copyPage(page, copyCtx)
      const prevFile = match(previousManifest)
        .with(P.nonNullable, (m) => m.files[entry.outputPath])
        .otherwise(() => {})
      const isNew =
        entry.contentHash !==
        match(prevFile)
          .with(P.nonNullable, (p) => p.contentHash)
          .otherwise(() => {})
      return { entry, isNew }
    })
  )

  // Build manifest from collected results
  const manifestFiles = Object.fromEntries(
    pageResults.map(({ entry }) => [entry.outputPath, entry])
  )
  // oxlint-disable-next-line eslint/no-unused-expressions -- side-effect boundary: manifest is intentionally mutable context accumulated during sync
  ctx.manifest.files = manifestFiles

  const { written, skipped } = pageResults.reduce(
    (counts, { isNew }) => {
      if (isNew) {
        return { written: counts.written + 1, skipped: counts.skipped }
      }
      return { written: counts.written, skipped: counts.skipped + 1 }
    },
    { written: 0, skipped: 0 }
  )

  // 5. Clean stale files
  const removed = await match(previousManifest)
    .with(P.nonNullable, async (m) => await cleanStaleFiles(outDir, m, ctx.manifest))
    .otherwise(() => Promise.resolve(0))

  // 6. Generate nav + write Rspress-native _meta.json / _nav.json
  const nav = generateNav(config, resolved)
  await writeMetaFiles({
    contentDir: outDir,
    entries: resolved,
    nav,
    openapiEntries: openapiResult.sidebar,
  })

  // 6.1 Write sidebar.json + nav.json snapshots for tooling / debugging.
  // Rspress no longer reads these (sidebar/nav come from _meta.json/_nav.json),
  // but they provide a single-file view of the resolved structure.
  await Promise.all([
    fs.writeFile(
      path.resolve(outDir, '.generated/sidebar.json'),
      JSON.stringify(buildSidebarSnapshot(resolved), null, 2),
      'utf8'
    ),
    fs.writeFile(path.resolve(outDir, '.generated/nav.json'), JSON.stringify(nav, null, 2), 'utf8'),
  ])

  // 7. Save manifest with incremental metadata
  const manifest = {
    ...ctx.manifest,
    assetConfigHash,
    openapiMtimes: openapiResult.specMtimes,
    resolvedCount: allPages.length,
  }
  await saveManifest(outDir, manifest)

  // 8. Write bare-bones README in .zpress/ root
  await writeZpressReadme(options.paths.outputRoot)

  const elapsed = performance.now() - start
  if (!quiet) {
    log.success(
      `Sync complete: ${written} written, ${skipped} unchanged, ${removed} removed (${elapsed.toFixed(0)}ms)`
    )
  }

  return { pagesWritten: written, pagesSkipped: skipped, pagesRemoved: removed, elapsed }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Recursively collect all page data from a resolved entry tree.
 *
 * @private
 * @param entries - Resolved entry tree nodes
 * @returns Flat array of page data from all entries and their children
 */
function collectPages(entries: readonly ResolvedEntry[]): PageData[] {
  return entries.reduce<PageData[]>((pages, entry) => {
    const withPage = concatPage(pages, entry.page)
    if (entry.items) {
      return [...withPage, ...collectPages(entry.items)]
    }
    return withPage
  }, [])
}

/**
 * Write a bare-bones README.md in the .zpress/ root explaining the directory.
 *
 * @private
 * @param outputRoot - Absolute path to the .zpress/ directory
 * @returns Promise that resolves when the file is written
 */
async function writeZpressReadme(outputRoot: string): Promise<void> {
  const readmePath = path.resolve(outputRoot, 'README.md')
  const content = `# .zpress

This directory is managed by zpress. It contains the
materialized documentation site — synced content, build artifacts, and static assets.

| Directory   | Description                                    |
| ----------- | ---------------------------------------------- |
| \`content/\`  | Synced markdown pages and generated config     |
| \`public/\`   | Static assets (logos, icons, banners)           |
| \`dist/\`     | Build output                                   |
| \`cache/\`    | Build cache                                    |

## Commands

\`\`\`bash
zpress sync    # Sync docs into content/
zpress dev     # Start dev server
zpress build   # Build static site
\`\`\`

> **Do not edit files in \`content/\`** — they are regenerated on every sync.
> Edit the source markdown in your workspace packages instead.
`
  await fs.writeFile(readmePath, content, 'utf8')
}

/**
 * Recursively copy all files from src to dest, overwriting existing files.
 *
 * @private
 * @param src - Source directory path
 * @param dest - Destination directory path
 * @returns Promise that resolves when all files are copied
 */
async function copyAll(src: string, dest: string): Promise<void> {
  const exists = await fs.stat(src).catch(() => null)
  if (!exists) {
    return
  }
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.resolve(src, entry.name)
      const destPath = path.resolve(dest, entry.name)
      if (entry.isDirectory()) {
        await copyAll(srcPath, destPath)
      } else {
        await fs.copyFile(srcPath, destPath)
      }
    })
  )
}

/**
 * Resolve the quiet flag to a boolean, defaulting to false.
 *
 * @private
 * @param quiet - Optional quiet flag from sync options
 * @returns Resolved boolean value
 */
function resolveQuiet(quiet: boolean | undefined | null): boolean {
  if (quiet !== undefined && quiet !== null) {
    return quiet
  }
  return false
}

/**
 * Append a page to the pages array if it exists.
 *
 * @private
 * @param pages - Existing pages array
 * @param page - Optional page to append
 * @returns New array with the page appended (if present)
 */
function concatPage(pages: readonly PageData[], page: PageData | undefined): PageData[] {
  if (page) {
    return [...pages, page]
  }
  return [...pages]
}

/**
 * Collect standalone sidebar scope paths from resolved entries.
 *
 * Returns an array of link paths (e.g. `["/packages", "/contributing"]`)
 * for sections that have `standalone: true`. These paths are written to
 * `.generated/scopes.json` and consumed at runtime by the custom Sidebar
 * component to isolate standalone sections into their own sidebar scope.
 *
 * @private
 * @param entries - Top-level resolved entries
 * @returns Array of standalone scope path strings
 */
function collectStandaloneScopePaths(entries: readonly ResolvedEntry[]): readonly string[] {
  return entries.filter((e) => (e.standalone || e.root) && e.link).map((e) => e.link as string)
}

/**
 * Collect scope paths from root-level OpenAPI sidebar entries.
 *
 * Root-level entries (from `config.openapi`) need their own standalone
 * scope so their sidebar items don't bleed into the main sidebar.
 * Workspace-level entries inherit their parent workspace's scope.
 *
 * @private
 * @param entries - OpenAPI sidebar entries from sync
 * @returns Array of root-level OpenAPI scope path strings
 */
function collectOpenapiScopePaths(entries: readonly OpenAPISidebarEntry[]): readonly string[] {
  return entries.filter((e) => e.rootLevel).map((e) => e.prefix)
}

/**
 * Extract an `AssetConfig` from the zpress config.
 * Falls back to 'Documentation' when no title is set.
 *
 * @private
 * @param config - Zpress config object
 * @returns Asset config with title and optional tagline
 */
function buildAssetConfig(config: ZpressConfig): AssetConfig {
  return { title: config.title ?? 'Documentation', tagline: config.tagline }
}

/**
 * Build a flat sidebar snapshot from the resolved entry tree.
 *
 * Produces a `Record<string, SidebarItem[]>` keyed by top-level section
 * link (or `"/"` for non-standalone sections). Used only for the
 * `.generated/sidebar.json` snapshot — Rspress reads `_meta.json` instead.
 *
 * @private
 * @param entries - Resolved entry tree
 * @returns Sidebar record suitable for JSON serialization
 */
function buildSidebarSnapshot(entries: readonly ResolvedEntry[]): Record<string, unknown[]> {
  return {
    '/': entriesToSidebarItems(entries) as unknown[],
  }
}

/**
 * Recursively convert resolved entries to sidebar items for the snapshot.
 *
 * @private
 * @param items - Resolved entries to convert
 * @returns Flat sidebar items array
 */
function entriesToSidebarItems(items: readonly ResolvedEntry[]): readonly SidebarItem[] {
  return items.filter((e) => !e.hidden).map(entryToSidebarItem)
}

/**
 * Convert a single resolved entry to a sidebar item.
 *
 * @private
 * @param entry - Resolved entry to convert
 * @returns Sidebar item with text, optional link, and optional children
 */
function entryToSidebarItem(entry: ResolvedEntry): SidebarItem {
  if (entry.items && entry.items.length > 0) {
    return {
      text: entry.title,
      ...maybeSidebarLink(entry.link),
      ...maybeSidebarCollapsed(entry.collapsible),
      items: entriesToSidebarItems(entry.items),
    }
  }
  return { text: entry.title, link: entry.link }
}

/**
 * Return a link property if defined.
 *
 * @private
 * @param link - Optional link string
 * @returns Object with link, or empty object
 */
function maybeSidebarLink(link: string | undefined): { readonly link?: string } {
  if (link) {
    return { link }
  }
  return {}
}

/**
 * Return a collapsed property if collapsible is true.
 *
 * @private
 * @param collapsible - Optional collapsible flag
 * @returns Object with collapsed flag, or empty object
 */
function maybeSidebarCollapsed(collapsible: boolean | undefined): { readonly collapsed?: true } {
  if (collapsible) {
    return { collapsed: true as const }
  }
  return {}
}
