/**
 * OpenAPI sync engine — reads specs, resolves refs, and generates MDX pages + sidebar.
 *
 * Reads an OpenAPI spec file (JSON or YAML), resolves all `$ref`s via
 * `@apidevtools/swagger-parser`, extracts operations from paths, groups
 * by tag, and generates one `.mdx` per operation plus an index overview page.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import SwaggerParser from '@apidevtools/swagger-parser'
import type { OpenAPIConfig, Workspace, ZpressConfig } from '@zpress/config'
import { collectAllWorkspaceItems } from '@zpress/config'
import { capitalize } from 'es-toolkit'
import { match, P } from 'ts-pattern'

import { renderOperationMarkdown, renderOverviewMarkdown } from './openapi-markdown.ts'
import { HTTP_METHODS } from './openapi-spec.ts'
import type { PageData, SidebarItem, SyncContext } from './types.ts'
import { slugify } from './workspace.ts'

/**
 * A sidebar entry keyed by its prefix path.
 */
export interface OpenAPISidebarEntry {
  readonly prefix: string
  readonly sidebar: readonly SidebarItem[]
  /**
   * True when this entry originates from the root `config.openapi` field
   * rather than a workspace item's `.openapi`. Root-level entries need
   * their own standalone sidebar scope and a root `_meta.json` dir entry.
   */
  readonly rootLevel: boolean
}

/**
 * Aggregate result from syncing all OpenAPI configs.
 */
export interface SyncOpenAPIResult {
  readonly sidebar: readonly OpenAPISidebarEntry[]
  readonly pages: readonly PageData[]
  readonly specMtimes: Readonly<Record<string, number>>
}

/**
 * Sync all OpenAPI configs from both root config and workspace items.
 *
 * Collects configs from `config.openapi` and all workspace items' `.openapi`,
 * processes each spec, and returns aggregated sidebar entries and pages.
 *
 * @param ctx - Sync context with config and paths
 * @returns Aggregated sidebar entries and generated pages
 */
export async function syncAllOpenAPI(ctx: SyncContext): Promise<SyncOpenAPIResult> {
  const rootConfigs = collectRootConfigs(ctx.config)
  const workspaceConfigs = collectWorkspaceConfigs(ctx.config)
  const allConfigs = [...rootConfigs, ...workspaceConfigs]

  if (allConfigs.length === 0) {
    return { sidebar: [], pages: [], specMtimes: {} }
  }

  const configResults = await Promise.all(allConfigs.map((entry) => syncOpenAPI(entry.config, ctx)))

  const specMtimes = configResults.reduce<Record<string, number>>(
    // oxlint-disable-next-line unicorn/no-accumulating-spread -- Object.assign avoids O(n^2) copies
    (acc, result) => Object.assign(acc, result.specMtimes),
    {}
  )

  return {
    sidebar: configResults.map((result, index) => ({
      prefix: allConfigs[index].config.path,
      sidebar: result.sidebar,
      rootLevel: allConfigs[index].rootLevel,
    })),
    pages: configResults.flatMap((result) => result.pages),
    specMtimes,
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * An operation extracted from an OpenAPI paths object.
 *
 * @private
 */
interface OperationInfo {
  readonly method: string
  readonly path: string
  readonly operationId: string
  readonly summary: string
  readonly tags: readonly string[]
}

/**
 * Operations grouped under a single tag.
 *
 * @private
 */
interface TagGroup {
  readonly tag: string
  readonly operations: readonly OperationInfo[]
}

/**
 * Result from processing a single OpenAPI spec.
 *
 * @private
 */
interface SingleSyncResult {
  readonly sidebar: readonly SidebarItem[]
  readonly pages: readonly PageData[]
  readonly specMtimes: Readonly<Record<string, number>>
}

/**
 * A config entry with its associated OpenAPI config and source flag.
 *
 * @private
 */
interface ConfigEntry {
  readonly config: OpenAPIConfig
  readonly rootLevel: boolean
}

/**
 * Sync a single OpenAPI spec — parse, extract operations, generate pages + sidebar.
 *
 * @private
 * @param config - OpenAPI config with spec path and prefix
 * @param ctx - Sync context
 * @returns Sidebar items and generated page data
 */
async function syncOpenAPI(config: OpenAPIConfig, ctx: SyncContext): Promise<SingleSyncResult> {
  const specAbsPath = path.resolve(ctx.repoRoot, config.spec)
  const specRelPath = config.spec

  // Stat the spec file to get mtime for caching
  const specStat = await fs.stat(specAbsPath).catch(() => null)
  const specMtime = match(specStat)
    .with(P.nonNullable, (s) => s.mtimeMs)
    .otherwise(() => null)

  // Try to use cached dereferenced spec when mtime is unchanged
  const api = await (async () => {
    if (specMtime !== null && ctx.openapiCache) {
      const prevMtime = match(ctx.previousManifest)
        .with(P.nonNullable, (m) => (m.openapiMtimes ?? {})[specRelPath])
        .otherwise(() => null)
      if (prevMtime === specMtime && ctx.openapiCache.has(specRelPath)) {
        return ctx.openapiCache.get(specRelPath) as Record<string, unknown>
      }
    }
    const parsed = await SwaggerParser.dereference(specAbsPath, {
      dereference: { circular: 'ignore' },
    }).catch((error: unknown) => {
      const message = match(error)
        .with(P.instanceOf(Error), (e) => e.message)
        .otherwise(String)
      console.warn(`[zpress] Failed to parse OpenAPI spec at ${specAbsPath}: ${message}`)
      return null
    })
    if (parsed === null) {
      // Evict stale cache entry so the next pass retries instead of serving stale output
      if (ctx.openapiCache) {
        ctx.openapiCache.delete(specRelPath)
      }
      return null
    }
    // Populate cache on successful parse
    if (ctx.openapiCache) {
      ctx.openapiCache.set(specRelPath, parsed)
    }
    return parsed
  })()

  const specMtimes: Readonly<Record<string, number>> = match(specMtime)
    .with(P.nonNullable, (mt) => ({ [specRelPath]: mt }))
    .otherwise(() => ({}))

  // oxlint-disable-next-line security/detect-possible-timing-attacks -- not a security comparison
  if (api === null) {
    return { sidebar: [], pages: [], specMtimes }
  }
  const paths = (api as Record<string, unknown>).paths as
    | Record<string, Record<string, unknown>>
    | undefined

  if (paths === null || paths === undefined) {
    return { sidebar: [], pages: [], specMtimes }
  }

  const operations = extractOperations(paths)
  const tagGroups = groupByTag(operations)
  const title = resolveTitle(config)
  const prefix = config.path

  // Write the fully dereferenced spec JSON into the content directory
  // so generated MDX pages can import it with a relative path.
  const specOutputPath = `${stripLeadingSlash(prefix)}/openapi.json`
  const specPage: PageData = {
    content: JSON.stringify(api, null, 2),
    outputPath: specOutputPath,
    frontmatter: {},
  }

  const spec = api as Record<string, unknown>
  const operationPages = tagGroups.flatMap((group) =>
    group.operations.map((op) => buildOperationPage(op, prefix, spec))
  )

  // Validate slug uniqueness — duplicate slugs would overwrite pages
  const slugCounts = Map.groupBy(operationPages, (page) => page.outputPath)
  const duplicates = [...slugCounts.entries()].filter(([, pages]) => pages.length > 1)
  if (duplicates.length > 0) {
    const duplicatePaths = duplicates.map(([p]) => p).join(', ')
    console.warn(
      `[zpress] Duplicate OpenAPI slugs detected: ${duplicatePaths}. Later operations will overwrite earlier ones.`
    )
  }

  const indexPage = buildIndexPage(title, prefix, spec)
  const pages = [specPage, indexPage, ...operationPages]

  const sidebarLayout = match(config.sidebarLayout)
    .with('title', () => 'title' as const)
    .otherwise(() => 'method-path' as const)
  const sidebarItems = buildSidebarItems(title, prefix, tagGroups, sidebarLayout)

  return { sidebar: sidebarItems, pages, specMtimes }
}

/**
 * Collect root-level OpenAPI config (if present).
 *
 * @private
 * @param config - Zpress config
 * @returns Array of config entries (zero or one)
 */
function collectRootConfigs(config: ZpressConfig): readonly ConfigEntry[] {
  return match(config.openapi)
    .with(P.nonNullable, (o) => [{ config: o, rootLevel: true }])
    .otherwise(() => [])
}

/**
 * Collect workspace-level OpenAPI configs from apps, packages, and workspace categories.
 *
 * @private
 * @param config - Zpress config
 * @returns Array of config entries from workspace items
 */
function collectWorkspaceConfigs(config: ZpressConfig): readonly ConfigEntry[] {
  const allWorkspaces = collectAllWorkspaceItems(config)

  return allWorkspaces
    .filter(
      (ws): ws is Workspace & { readonly openapi: OpenAPIConfig } =>
        ws.openapi !== null && ws.openapi !== undefined
    )
    .map((ws) => ({ config: ws.openapi, rootLevel: false }))
}

/**
 * Extract all operations from OpenAPI paths object.
 *
 * @private
 * @param paths - OpenAPI paths object keyed by path string
 * @returns Flat array of operation info for all HTTP methods
 */
function extractOperations(
  paths: Record<string, Record<string, unknown>>
): readonly OperationInfo[] {
  return Object.entries(paths).flatMap(([pathStr, methods]) =>
    HTTP_METHODS.filter((method) => methods[method] !== null && methods[method] !== undefined).map(
      (method) => {
        const op = methods[method] as Record<string, unknown>
        const summary = match(op.summary)
          .with(P.string, (s) => s)
          .otherwise(() => `${method.toUpperCase()} ${pathStr}`)
        const operationId = match(op.operationId)
          .with(P.string, (id) => id)
          .otherwise(() => `${method}-${slugify(pathStr)}`)
        const tags = match(op.tags)
          .with(P.array(P.string), (t) => t)
          .otherwise(() => ['default'])
        return { method, path: pathStr, operationId, summary, tags }
      }
    )
  )
}

/**
 * Group operations by their first tag.
 *
 * @private
 * @param operations - Flat array of operation info
 * @returns Operations grouped by tag name
 */
function groupByTag(operations: readonly OperationInfo[]): readonly TagGroup[] {
  const grouped = Map.groupBy(operations, (op) =>
    match(op.tags[0])
      .with(P.string, (t) => t)
      .otherwise(() => 'default')
  )

  return [...grouped.entries()].map(([tag, ops]) => ({ tag, operations: ops }))
}

/**
 * Build an MDX page for a single OpenAPI operation.
 *
 * Wraps the interactive component with a `LlmsMarkdownOverride` component that
 * renders the pre-generated markdown during Rspress's SSR markdown pass,
 * so the per-page `.md` endpoint serves structured content instead of
 * raw MDX/JSX source.
 *
 * @private
 * @param op - Operation info (method, path, operationId, summary)
 * @param prefix - URL prefix for the OpenAPI section
 * @param spec - Dereferenced OpenAPI spec
 * @returns Page data with MDX content importing the spec and rendering the operation
 */
function buildOperationPage(
  op: OperationInfo,
  prefix: string,
  spec: Record<string, unknown>
): PageData {
  const slug = slugify(op.operationId)
  const outputPath = `${stripLeadingSlash(prefix)}/${slug}.mdx`
  const title = op.summary
  const markdown = renderOperationMarkdown({
    spec,
    method: op.method,
    path: op.path,
    operationId: op.operationId,
  })

  const content = [
    '---',
    `title: ${JSON.stringify(title)}`,
    '---',
    '',
    "import spec from './openapi.json'",
    "import { CopyMarkdownButton, OpenAPIOperation } from '@zpress/ui/theme'",
    '',
    `export const markdown = ${JSON.stringify(markdown)}`,
    '',
    '<CopyMarkdownButton markdown={markdown} />',
    '',
    '<OpenAPIOperation',
    '  spec={spec}',
    `  method={${JSON.stringify(op.method)}}`,
    `  path={${JSON.stringify(op.path)}}`,
    `  operationId={${JSON.stringify(op.operationId)}}`,
    '  markdown={markdown}',
    '/>',
    '',
  ].join('\n')

  return {
    content,
    outputPath,
    frontmatter: { title },
  }
}

/**
 * Build an index/overview MDX page for the OpenAPI spec.
 *
 * Includes a `LlmsMarkdownOverride` component so Rspress's SSR markdown pass
 * outputs the pre-rendered overview markdown for the `.md` endpoint.
 *
 * @private
 * @param title - Display title for the overview page
 * @param prefix - URL prefix for the OpenAPI section
 * @param spec - Dereferenced OpenAPI spec
 * @returns Page data with MDX content rendering the overview component
 */
function buildIndexPage(title: string, prefix: string, spec: Record<string, unknown>): PageData {
  const outputPath = `${stripLeadingSlash(prefix)}/index.mdx`
  const markdown = renderOverviewMarkdown({ spec })

  const content = [
    '---',
    `title: ${JSON.stringify(title)}`,
    '---',
    '',
    "import spec from './openapi.json'",
    "import { CopyMarkdownButton, OpenAPIOverview } from '@zpress/ui/theme'",
    '',
    `export const markdown = ${JSON.stringify(markdown)}`,
    '',
    '<CopyMarkdownButton markdown={markdown} />',
    '',
    '<OpenAPIOverview spec={spec} markdown={markdown} />',
    '',
  ].join('\n')

  return {
    content,
    outputPath,
    frontmatter: { title },
  }
}

/**
 * Build sidebar items grouped by tag.
 *
 * @private
 * @param title - Root sidebar item title
 * @param prefix - URL prefix for linking operations
 * @param tagGroups - Operations grouped by tag
 * @param sidebarLayout - Display style for sidebar entries
 * @returns Sidebar item tree with tag groups as children
 */
function buildSidebarItems(
  title: string,
  prefix: string,
  tagGroups: readonly TagGroup[],
  sidebarLayout: 'method-path' | 'title'
): readonly SidebarItem[] {
  const tagItems: readonly SidebarItem[] = tagGroups.map((group) => ({
    text: capitalize(group.tag),
    collapsed: false,
    items: group.operations.map((op) => ({
      text: formatSidebarText(op, sidebarLayout),
      link: `${prefix}/${slugify(op.operationId)}`,
    })),
  }))

  return [
    {
      text: title,
      link: prefix,
      items: tagItems,
    },
  ]
}

/**
 * Format sidebar text for an operation based on the configured style.
 *
 * - `'method-path'` renders an HTML string with a colored method badge
 *   (`.zp-oas-sidebar-badge--{method}`) and the API path in monospace
 *   (`.zp-oas-sidebar-path`). Rspress renders this via `dangerouslySetInnerHTML`.
 * - `'title'` renders the operation summary as plain text (e.g., "List Users")
 *
 * @private
 * @param op - Operation info with method and summary
 * @param style - Sidebar display style
 * @returns Formatted sidebar text string (plain or HTML)
 */
function formatSidebarText(op: OperationInfo, style: 'method-path' | 'title'): string {
  return match(style)
    .with('title', () => op.summary)
    .with('method-path', () => {
      const method = op.method.toUpperCase()
      const badge = `<span class="zp-oas-sidebar-badge zp-oas-sidebar-badge--${op.method}">${method}</span>`
      const pathHtml = `<code class="zp-oas-sidebar-path">${escapeHtml(op.path)}</code>`
      return `${badge}${pathHtml}`
    })
    .exhaustive()
}

/**
 * Resolve the sidebar title from config, defaulting to 'API Reference'.
 *
 * @private
 * @param config - OpenAPI config with optional title
 * @returns Resolved title string
 */
function resolveTitle(config: OpenAPIConfig): string {
  return match(config.title)
    .with(P.string, (t) => t)
    .otherwise(() => 'API Reference')
}

/**
 * Escape HTML special characters for safe interpolation into HTML strings.
 *
 * @private
 * @param text - Raw text to escape
 * @returns HTML-escaped text
 */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Strip the leading slash from a path for use as an output path.
 *
 * @private
 * @param p - Path string that may start with '/'
 * @returns Path without leading slash
 */
function stripLeadingSlash(p: string): string {
  if (p.startsWith('/')) {
    return p.slice(1)
  }
  return p
}
