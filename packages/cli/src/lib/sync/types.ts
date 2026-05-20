import type { CardConfig, ZpressConfig, Frontmatter } from '@zpress/config'

import type { SourceMap } from './rewrite-links.ts'

/**
 * Context threaded through all sync operations.
 */
export interface SyncContext {
  /**
   * Absolute path to repo root.
   */
  readonly repoRoot: string
  /**
   * Absolute path to .content/ output directory.
   */
  readonly outDir: string
  /**
   * Resolved config.
   */
  readonly config: ZpressConfig
  /**
   * Previous manifest (for incremental sync).
   */
  readonly previousManifest: Manifest | null
  /**
   * Current manifest being built.
   *
   * @remarks Mutable during the sync pass — entries are added as pages are copied.
   * Will be refactored to an immutable accumulator pattern in a future pass.
   */
  manifest: Manifest
  /**
   * When true, suppress all log output during sync.
   */
  readonly quiet: boolean
  /**
   * Mapping from repo-relative source paths to content-relative output paths.
   * Used by the copy step to rewrite relative markdown links.
   */
  readonly sourceMap?: SourceMap
  /**
   * Cache of dereferenced OpenAPI specs keyed by repo-relative spec path.
   * Shared across sync passes to avoid re-parsing unchanged specs.
   */
  readonly openapiCache?: Map<string, unknown>
  /**
   * When true, bypass mtime-based skip optimization (e.g. after structural changes).
   */
  readonly skipMtimeOptimization?: boolean
}

/**
 * Tracks output files for incremental sync and stale file cleanup.
 */
export interface Manifest {
  /**
   * Map of output relative path to entry metadata.
   *
   * @remarks Mutable — entries are accumulated during the sync pass as pages
   * are copied. The manifest is built incrementally and then persisted to disk.
   * Will be refactored to an immutable accumulator pattern alongside `SyncContext.manifest`.
   */
  files: Record<string, ManifestEntry>
  /**
   * Timestamp of last sync.
   */
  readonly timestamp: number
  /**
   * SHA-256 hash of the asset config used to generate banner/logo/icon SVGs.
   * When unchanged, asset generation is skipped entirely.
   */
  readonly assetConfigHash?: string
  /**
   * Mtime (ms) of each OpenAPI spec file at last sync, keyed by repo-relative path.
   * Used to skip re-parsing unchanged specs.
   */
  readonly openapiMtimes?: Readonly<Record<string, number>>
  /**
   * Number of resolved pages in the last sync pass.
   * A mismatch triggers a full resync (structural change detected).
   */
  readonly resolvedCount?: number
}

/**
 * Metadata for a single output file tracked in the manifest.
 */
export interface ManifestEntry {
  /**
   * Repo-relative path to source file (undefined for virtual pages).
   */
  readonly source?: string
  /**
   * Source file mtime in ms (for quick-check).
   */
  readonly sourceMtime?: number
  /**
   * SHA-256 hex of the written output.
   */
  readonly contentHash: string
  /**
   * Output path relative to .content/.
   */
  readonly outputPath: string
  /**
   * MD5 hex of the page's injected frontmatter.
   * Used with sourceMtime to detect config-driven frontmatter changes
   * without reading the source file.
   */
  readonly frontmatterHash?: string
}

/**
 * Internal resolved node — produced by the resolver, consumed by copy + sidebar/nav generators.
 */
export interface ResolvedEntry {
  readonly title: string
  readonly description?: string
  readonly link?: string
  readonly collapsible?: boolean
  readonly hidden?: boolean
  /**
   * @remarks Mutable — `injectLandingPages` may reassign items when
   * promoting an overview child to section page. Will be refactored
   * to immutable tree rebuild.
   */
  items?: readonly ResolvedEntry[]
  /**
   * Present on leaf pages (and section headers that are also pages).
   *
   * @remarks Mutable — `injectLandingPages` assigns virtual pages to sections
   * that have a link but no page. Will be refactored to immutable tree rebuild
   * when landing pages move to Vue components.
   */
  page?: PageData
  readonly card?: CardConfig
  /**
   * When false, skip auto-generated landing page for this section.
   * Defaults to true.
   */
  readonly landing?: boolean
  /**
   * When true, this section gets its own sidebar namespace keyed by `link`.
   */
  readonly standalone?: boolean
  /**
   * When true, child sections are promoted to top-level sidebar items
   * and the parent title is hidden from the sidebar hierarchy.
   * Implies standalone scope isolation.
   */
  readonly root?: boolean
  /**
   * When true, `link` was auto-derived from `path` or children's common prefix
   * rather than explicitly set in the config.
   */
  readonly autoLink?: boolean
}

/**
 * Data for a single page to be written to the output directory.
 */
export interface PageData {
  /**
   * Absolute path to source .md (undefined for virtual pages).
   */
  readonly source?: string
  /**
   * Inline content for virtual pages.
   */
  readonly content?: string | (() => string | Promise<string>)
  /**
   * Relative path inside .content/ (e.g. "guides/add-api-route.md").
   */
  readonly outputPath: string
  /**
   * Merged frontmatter to inject.
   */
  readonly frontmatter: Frontmatter
}

/**
 * Rspress sidebar item shape.
 *
 * Constructed immutably by sidebar generators, then serialized to JSON.
 */
export interface SidebarItem {
  readonly text: string
  readonly link?: string
  /**
   * Rspress `collapsed` — set by sidebar generator from `collapsible`.
   */
  readonly collapsed?: boolean
  readonly items?: readonly SidebarItem[]
}

/**
 * Rspress nav item shape.
 *
 * Uses `text` (not `title`) to match Rspress's expected NavItem interface.
 */
export interface RspressNavItem {
  readonly text: string
  readonly link?: string
  readonly items?: readonly RspressNavItem[]
  readonly activeMatch?: string
}
