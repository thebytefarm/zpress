/**
 * Write Rspress `_meta.json` and `_nav.json` files to the content directory.
 *
 * These files enable Rspress's native sidebar/nav auto-discovery with HMR
 * support, replacing the static `.generated/sidebar.json` approach.
 *
 * @see https://rspress.dev/guide/basic/auto-nav-sidebar
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { OpenAPISidebarEntry } from '../openapi.ts'
import type { ResolvedEntry, RspressNavItem, SidebarItem } from '../types.ts'
import type { MetaDirectory, MetaDirItem, MetaItem, MetaSectionHeaderItem } from './meta.ts'
import { buildMetaDirectories, buildRootMeta } from './meta.ts'

/**
 * Options for writing meta files.
 */
interface WriteMetaOptions {
  /**
   * Absolute path to the content output directory.
   */
  readonly contentDir: string
  /**
   * Resolved entry tree from the sync engine.
   */
  readonly entries: readonly ResolvedEntry[]
  /**
   * Generated nav items for `_nav.json`.
   */
  readonly nav: readonly RspressNavItem[]
  /**
   * OpenAPI sidebar entries to write as `_meta.json` in their prefix directories.
   */
  readonly openapiEntries: readonly OpenAPISidebarEntry[]
}

/**
 * Write `_meta.json` files for all section directories and `_nav.json` at root.
 *
 * Creates a `_meta.json` in each directory that has sidebar items, controlling
 * the ordering and labels. Also writes `_nav.json` at the content root for
 * Rspress navigation auto-discovery.
 *
 * OpenAPI directories receive flat `_meta.json` files with section-header
 * items for tag groups.
 *
 * @param options - Content directory, resolved entries, nav items, and OpenAPI entries
 * @returns Promise that resolves when all files are written
 */
export async function writeMetaFiles(options: WriteMetaOptions): Promise<void> {
  const { contentDir, entries, nav, openapiEntries } = options

  const sectionDirectories = buildMetaDirectories(entries)
  const openapiDirectories = openapiEntries.flatMap(buildOpenapiMetaDirectory)
  const rootMeta = buildRootMeta(entries)

  // Merge OpenAPI entries into the appropriate _meta.json files:
  // - Root-level entries → root _meta.json as dir items
  // - Workspace-level entries → parent directory's _meta.json as dir items
  const openapiRootItems = buildOpenapiRootMetaItems(openapiEntries)
  const mergedSectionDirectories = mergeOpenapiParentEntries(sectionDirectories, openapiEntries)

  const mergedRootMeta = [...rootMeta, ...openapiRootItems]

  const allDirectories = [...mergedSectionDirectories, ...openapiDirectories]

  // Ensure all directories referenced in the root _meta.json exist on disk.
  // Rspress's auto-nav-sidebar reads these with scandir and crashes if missing.
  const rootDirNames = mergedRootMeta
    .filter(
      (item): item is MetaDirItem =>
        typeof item !== 'string' && 'type' in item && item.type === 'dir'
    )
    .map((item) => item.name)

  await Promise.all([
    // Create directories referenced in root _meta.json
    ...rootDirNames.map((name) => fs.mkdir(path.resolve(contentDir, name), { recursive: true })),
    // Write root _meta.json (unified sidebar for non-standalone sections)
    fs.writeFile(
      path.resolve(contentDir, '_meta.json'),
      JSON.stringify(mergedRootMeta, null, 2),
      'utf8'
    ),
    // Write _meta.json for each subdirectory
    ...allDirectories.map(async (dir) => {
      const metaPath = path.resolve(contentDir, dir.dirPath, '_meta.json')
      await fs.mkdir(path.dirname(metaPath), { recursive: true })
      await fs.writeFile(metaPath, JSON.stringify(dir.items, null, 2), 'utf8')
    }),
    // Write _nav.json at content root
    fs.writeFile(path.resolve(contentDir, '_nav.json'), JSON.stringify(nav, null, 2), 'utf8'),
  ])
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build root `_meta.json` dir items for root-level OpenAPI entries.
 *
 * Root-level entries (from `config.openapi`) need a `dir` item in the root
 * `_meta.json` so Rspress discovers them in the unified sidebar.
 * Workspace-level entries are nested under an existing section and do not
 * need root-level discovery.
 *
 * @private
 * @param entries - All OpenAPI sidebar entries
 * @returns Dir meta items for root-level entries
 */
function buildOpenapiRootMetaItems(
  entries: readonly OpenAPISidebarEntry[]
): readonly MetaDirItem[] {
  return entries
    .filter((entry) => entry.rootLevel)
    .flatMap((entry) => {
      const dirName = stripLeadingSlash(entry.prefix)
      if (dirName === '' || dirName.includes('/')) {
        return []
      }
      const label = resolveOpenapiLabel(entry)
      return [{ type: 'dir' as const, name: dirName, label }]
    })
}

/**
 * Merge workspace-level OpenAPI entries into their parent directory's meta.
 *
 * For each workspace-level OpenAPI entry whose prefix is nested (e.g.
 * `/apps/api/reference`), adds a `dir` item for the last segment
 * (`reference`) into the parent directory's (`apps/api`) `_meta.json`.
 * If the parent directory doesn't exist yet, creates a new MetaDirectory.
 *
 * @private
 * @param directories - Existing section meta directories
 * @param openapiEntries - All OpenAPI sidebar entries
 * @returns Updated directories with workspace-level OpenAPI dir items merged in
 */
function mergeOpenapiParentEntries(
  directories: readonly MetaDirectory[],
  openapiEntries: readonly OpenAPISidebarEntry[]
): readonly MetaDirectory[] {
  const workspaceEntries = openapiEntries.filter((entry) => !entry.rootLevel)
  if (workspaceEntries.length === 0) {
    return [...directories]
  }

  // Build a mutable map of dirPath → items for merging
  const dirMap = new Map<string, MetaItem[]>(
    directories.map((dir) => [dir.dirPath, [...dir.items]])
  )

  workspaceEntries.reduce<null>((_, entry) => {
    const cleanPrefix = stripLeadingSlash(entry.prefix)
    if (cleanPrefix === '' || !cleanPrefix.includes('/')) {
      return null
    }
    const segments = cleanPrefix.split('/')
    const childName = segments.at(-1) as string
    const parentDir = segments.slice(0, -1).join('/')
    const label = resolveOpenapiLabel(entry)
    const dirItem: MetaDirItem = { type: 'dir', name: childName, label }

    const existing = dirMap.get(parentDir)
    if (existing) {
      existing.push(dirItem)
    } else {
      dirMap.set(parentDir, [dirItem])
    }
    return null
  }, null)

  return [...dirMap.entries()].map(([dirPath, items]) => ({ dirPath, items }))
}

/**
 * Resolve the display label for an OpenAPI sidebar entry.
 *
 * Extracts the title from the root sidebar item (e.g. "API Reference"),
 * falling back to "API Reference" when the sidebar is empty.
 *
 * @private
 * @param entry - OpenAPI sidebar entry
 * @returns Display label string
 */
function resolveOpenapiLabel(entry: OpenAPISidebarEntry): string {
  const [root] = entry.sidebar
  if (root && root.text) {
    return root.text
  }
  return 'API Reference'
}

/**
 * Build a `_meta.json` directory entry for an OpenAPI sidebar.
 *
 * Flattens the nested tag-group sidebar structure into a flat list
 * using `section-header` items for tag labels and `file` items for operations.
 * The index page (overview) is listed first.
 *
 * @private
 * @param entry - OpenAPI sidebar entry with prefix and sidebar items
 * @returns MetaDirectory for the OpenAPI prefix directory
 */
function buildOpenapiMetaDirectory(entry: OpenAPISidebarEntry): readonly MetaDirectory[] {
  const dirPath = stripLeadingSlash(entry.prefix)
  if (dirPath === '') {
    return []
  }

  const items = flattenOpenapiSidebar(entry.sidebar, entry.prefix, entry.rootLevel)

  return [{ dirPath, items }]
}

/**
 * Flatten a nested OpenAPI sidebar into ordered `_meta.json` items.
 *
 * The root sidebar item (e.g. "API Reference") is represented by the
 * index page. Each tag group becomes a `section-header` followed by
 * its operation file items.
 *
 * @private
 * @param sidebar - Nested sidebar items from OpenAPI sync
 * @param prefix - URL prefix for the OpenAPI section
 * @returns Flat array of meta items
 */
function flattenOpenapiSidebar(
  sidebar: readonly SidebarItem[],
  prefix: string,
  rootLevel: boolean
): readonly MetaItem[] {
  // The root sidebar typically has one item: { text: "API Reference", items: [tag groups] }
  // Extract the tag groups from the root item's children
  const tagGroups = sidebar.flatMap((root) => root.items ?? [])

  const tagItems = tagGroupsToMetaItems(tagGroups, prefix)

  // Root-level entries have a `dir` item in root _meta.json that already
  // links to the index page. Including it again causes a double highlight.
  // Workspace-level entries have no parent dir linking to them, so they
  // need the explicit index item.
  if (rootLevel) {
    return [...tagItems]
  }

  const indexItem: MetaItem = { type: 'file', name: 'index', label: 'Overview' }
  return [indexItem, ...tagItems]
}

/**
 * Convert OpenAPI tag groups to flat meta items with section headers.
 *
 * Each tag group produces a section-header followed by file items
 * for each operation in that group.
 *
 * @private
 * @param groups - Tag group sidebar items
 * @param prefix - URL prefix for extracting file stems
 * @returns Flat array of meta items
 */
function tagGroupsToMetaItems(groups: readonly SidebarItem[], prefix: string): readonly MetaItem[] {
  return groups.reduce<MetaItem[]>((acc, group) => {
    const header: MetaSectionHeaderItem = { type: 'section-header', label: group.text }
    const operations: readonly MetaItem[] = (group.items ?? []).flatMap((op) => {
      const stem = extractStemFromLink(op.link, prefix)
      if (stem === null) {
        return []
      }
      return [{ type: 'file' as const, name: stem, label: op.text }]
    })
    // oxlint-disable-next-line unicorn/no-accumulating-spread -- small bounded arrays (tag count)
    return [...acc, header, ...operations]
  }, [])
}

/**
 * Extract a filename stem from a sidebar link, removing the prefix.
 *
 * @private
 * @param link - Sidebar link (e.g. "/api/list-users")
 * @param prefix - URL prefix to strip (e.g. "/api")
 * @returns Filename stem (e.g. "list-users") or null
 */
function extractStemFromLink(link: string | undefined, prefix: string): string | null {
  if (!link) {
    return null
  }
  const cleanPrefix = stripLeadingSlash(prefix)
  const cleanLink = stripLeadingSlash(link)
  if (cleanLink.startsWith(`${cleanPrefix}/`)) {
    return cleanLink.slice(cleanPrefix.length + 1)
  }
  return cleanLink.split('/').at(-1) ?? null
}

/**
 * Strip the leading slash from a path.
 *
 * @private
 * @param p - Path string
 * @returns Path without leading slash
 */
function stripLeadingSlash(p: string): string {
  if (p.startsWith('/')) {
    return p.slice(1)
  }
  return p
}
