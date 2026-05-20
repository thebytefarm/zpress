/**
 * _meta.json generation — converts ResolvedEntry trees to Rspress sidebar meta format.
 *
 * Rspress uses per-directory `_meta.json` files to control sidebar ordering,
 * labels, and collapsed state. This module converts the resolved entry tree
 * into a flat list of directories, each with its ordered meta items.
 *
 * Placement is filesystem-first: each entry is placed in the `_meta.json`
 * of its actual parent directory (derived from output path or link), not
 * from its position in the config tree. This handles cases where the
 * config tree doesn't match the directory hierarchy.
 *
 * @see https://rspress.dev/guide/basic/auto-nav-sidebar
 */

import { basename, dirname, extname } from 'node:path'

import type { ResolvedEntry } from '../types.ts'

/**
 * A meta item for Rspress's `_meta.json` sidebar control.
 *
 * String items reference files by stem (Rspress reads frontmatter for label).
 * Object items describe directories, files, or section headers with explicit labels.
 */
export type MetaItem = string | MetaDirItem | MetaFileItem | MetaSectionHeaderItem

/**
 * A directory entry in `_meta.json`.
 */
export interface MetaDirItem {
  readonly type: 'dir'
  readonly name: string
  readonly label: string
  readonly collapsed?: boolean
}

/**
 * A file entry in `_meta.json` with explicit label.
 */
export interface MetaFileItem {
  readonly type: 'file'
  readonly name: string
  readonly label: string
}

/**
 * A section header entry in `_meta.json` — visual label with no link.
 */
export interface MetaSectionHeaderItem {
  readonly type: 'section-header'
  readonly label: string
}

/**
 * A directory that needs a `_meta.json` written.
 */
export interface MetaDirectory {
  /**
   * Directory path relative to content dir (e.g., "concepts" or "concepts/engine").
   */
  readonly dirPath: string
  /**
   * Ordered meta items for this directory's `_meta.json`.
   */
  readonly items: readonly MetaItem[]
}

/**
 * Build the root `_meta.json` items for the content directory.
 *
 * Rspress creates a separate sidebar per top-level directory by default.
 * A root `_meta.json` listing all sections as `dir` items tells Rspress
 * to generate a single unified sidebar (keyed by `"/"`) instead, with
 * full HMR support for sidebar changes.
 *
 * @param entries - Top-level resolved entries (sections)
 * @returns Root meta items for the content-level `_meta.json`
 */
export function buildRootMeta(entries: readonly ResolvedEntry[]): readonly MetaItem[] {
  return entries
    .filter((e) => !e.hidden)
    .flatMap((entry) => {
      if (entry.root && entry.items) {
        return entry.items
          .filter((child) => !child.hidden)
          .flatMap((child): readonly (MetaDirItem | MetaFileItem)[] => {
            const name = resolveDirName(child)
            if (name === null) {
              return []
            }
            if (hasChildren(child)) {
              return [{ type: 'dir' as const, name, label: child.title }]
            }
            return [{ type: 'file' as const, name, label: child.title }]
          })
      }

      const name = resolveDirName(entry)
      if (name === null) {
        return []
      }
      return [
        {
          type: 'dir' as const,
          name,
          label: entry.title,
        },
      ]
    })
}

/**
 * Build all `_meta.json` directory entries from a resolved entry tree.
 *
 * Uses a filesystem-first approach: each entry is placed in the `_meta.json`
 * of its actual parent directory on disk, regardless of its position in the
 * config tree. This correctly handles cases where the config tree nesting
 * doesn't match the directory hierarchy (e.g., a section at
 * `/contributing/concepts/engine` configured as a flat child of `/contributing`).
 *
 * @param entries - Top-level resolved entries (sections)
 * @returns Flat array of directories needing `_meta.json` files
 */
export function buildMetaDirectories(entries: readonly ResolvedEntry[]): readonly MetaDirectory[] {
  const visibleEntries = entries.filter((entry) => !entry.hidden)
  const rootParentDirs = new Set(
    visibleEntries
      .filter((entry) => entry.root && entry.link)
      .map((entry) => stripLeadingSlash(entry.link ?? ''))
      .filter(Boolean)
  )
  const expanded = visibleEntries.flatMap((entry) => {
    if (entry.root && entry.items) {
      return entry.items.filter((child) => !child.hidden)
    }
    return [entry]
  })
  const { placements } = flattenToPlacements(expanded, 0)
  return groupPlacementsByDir(placements).filter((dir) => !rootParentDirs.has(dir.dirPath))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * A placement instruction: which directory a meta item belongs to.
 *
 * @private
 */
interface MetaPlacement {
  /**
   * Target directory path for the `_meta.json` (e.g., "contributing/concepts").
   */
  readonly dirPath: string
  /**
   * The meta item to write.
   */
  readonly item: MetaItem
  /**
   * Insertion order for stable sorting within a directory.
   */
  readonly order: number
  /**
   * Whether this is a section (directory) or a leaf (file).
   * Leaves are ordered before sections within each directory.
   */
  readonly isSection: boolean
}

/**
 * Accumulator returned by the recursive flattener.
 *
 * @private
 */
interface FlattenResult {
  readonly placements: readonly MetaPlacement[]
  readonly nextOrder: number
}

/**
 * Recursively flatten the entry tree into placement instructions.
 *
 * For each visible entry, determines its target `_meta.json` directory
 * from the filesystem path and emits a placement. Sections are recursed
 * into so their children also get placements.
 *
 * @private
 * @param entries - Entries to flatten
 * @param startOrder - Starting order counter for stable sorting
 * @returns Placements and the next available order counter
 */
function flattenToPlacements(entries: readonly ResolvedEntry[], startOrder: number): FlattenResult {
  return entries
    .filter((e) => !e.hidden)
    .reduce<FlattenResult>(
      (acc, entry) => {
        const isSection = hasChildren(entry)

        if (isSection) {
          return flattenSection(entry, acc)
        }

        return flattenLeaf(entry, acc)
      },
      { placements: [], nextOrder: startOrder }
    )
}

/**
 * Create placements for a section entry and recurse into its children.
 *
 * The section itself becomes a `dir` item in its filesystem parent's
 * `_meta.json`. Its children are recursively flattened.
 *
 * @private
 * @param entry - Section entry with children
 * @param acc - Current accumulator
 * @returns Updated accumulator with section and child placements
 */
function flattenSection(entry: ResolvedEntry, acc: FlattenResult): FlattenResult {
  const dirPath = resolveDirPath(entry)
  if (dirPath === null) {
    return acc
  }

  const parentDir = dirname(dirPath)
  // dirname returns '.' for top-level paths like "concepts"
  const targetDir = resolveTargetDir(parentDir)

  // Only place the dir item if it has a real parent directory.
  // Top-level sections (targetDir === '') are discovered by Rspress automatically.
  const dirPlacement: readonly MetaPlacement[] = buildDirPlacement(targetDir, entry, acc.nextOrder)

  // Recurse into children
  const childResult = flattenToPlacements(entry.items ?? [], acc.nextOrder + 1)

  return {
    // oxlint-disable-next-line unicorn/no-accumulating-spread -- bounded by tree depth
    placements: [...acc.placements, ...dirPlacement, ...childResult.placements],
    nextOrder: childResult.nextOrder,
  }
}

/**
 * Create a placement for a leaf entry.
 *
 * The leaf becomes a `file` item in its filesystem parent's `_meta.json`.
 *
 * @private
 * @param entry - Leaf entry (no children)
 * @param acc - Current accumulator
 * @returns Updated accumulator with the leaf placement
 */
function flattenLeaf(entry: ResolvedEntry, acc: FlattenResult): FlattenResult {
  const targetDir = resolveLeafParentDir(entry)
  if (targetDir === null) {
    return acc
  }

  const placement: MetaPlacement = {
    dirPath: targetDir,
    item: leafToMetaItem(entry),
    order: acc.nextOrder,
    isSection: false,
  }

  return {
    // oxlint-disable-next-line unicorn/no-accumulating-spread -- bounded by entry count per section
    placements: [...acc.placements, placement],
    nextOrder: acc.nextOrder + 1,
  }
}

/**
 * Resolve a parent directory path, mapping '.' to empty string for top-level.
 *
 * @private
 * @param parentDir - Raw dirname result
 * @returns Empty string for top-level, otherwise the parent path
 */
function resolveTargetDir(parentDir: string): string {
  if (parentDir === '.') {
    return ''
  }
  return parentDir
}

/**
 * Build a dir placement array for a section entry.
 *
 * Returns an empty array when the target directory is top-level (empty string),
 * since Rspress discovers top-level sections automatically.
 *
 * @private
 * @param targetDir - Target directory for the placement
 * @param entry - Section entry to place
 * @param order - Insertion order for stable sorting
 * @returns Single-element placement array, or empty array for top-level
 */
function buildDirPlacement(
  targetDir: string,
  entry: ResolvedEntry,
  order: number
): readonly MetaPlacement[] {
  if (targetDir === '') {
    return []
  }
  return [
    {
      dirPath: targetDir,
      item: sectionToMetaItem(entry),
      order,
      isSection: true,
    },
  ]
}

/**
 * Group placements by target directory and build MetaDirectory entries.
 *
 * Within each directory, leaves are ordered before sections (matching
 * the existing sidebar convention), with stable ordering within each group.
 *
 * @private
 * @param placements - All placement instructions
 * @returns Deduplicated MetaDirectory entries
 */
function groupPlacementsByDir(placements: readonly MetaPlacement[]): readonly MetaDirectory[] {
  const grouped = Map.groupBy(placements, (p) => p.dirPath)
  const allDirPaths = new Set(grouped.keys())

  return [...grouped.entries()]
    .filter(([dirPath]) => dirPath !== '')
    .map(([dirPath, items]) => {
      const leaves = items.filter((p) => !p.isSection).toSorted((a, b) => a.order - b.order)
      const sections = items.filter((p) => p.isSection).toSorted((a, b) => a.order - b.order)
      // Build a lookup of merged sections keyed by name. Merging uses the
      // section's label but downgrades to file type when no subdirectory
      // content exists (see mergeWithLeaf).
      const mergedByName = new Map(
        sections
          .map((s) => mergeWithLeaf({ section: s, leaves, dirPath, allDirPaths }))
          .map((s) => [extractItemName(s.item), s] as const)
          .filter((pair): pair is readonly [string, MetaPlacement] => pair[0] !== null)
      )
      // Leaves first, then sections — preserving relative order within each
      // group. Merged sections replace their leaf counterpart so the section
      // label wins but the item appears in the sections block (bottom).
      const mergedNames = new Set(mergedByName.keys())
      const orderedLeaves = leaves.filter((p) => {
        const name = extractItemName(p.item)
        // Exclude leaves that were merged into a section (they'll appear below)
        return name === null || !mergedNames.has(name)
      })
      const orderedSections = sections.map((s) => {
        const name = extractItemName(s.item)
        if (name === null) {
          return s
        }
        return mergedByName.get(name) ?? s
      })
      const deduped = [...orderedLeaves, ...orderedSections]
      return { dirPath, items: deduped.map((p) => p.item) }
    })
}

/**
 * Parameters for {@link mergeWithLeaf}.
 *
 * @private
 */
interface MergeWithLeafParams {
  readonly section: MetaPlacement
  readonly leaves: readonly MetaPlacement[]
  readonly dirPath: string
  readonly allDirPaths: ReadonlySet<string>
}

/**
 * Merge a section placement with its matching leaf when the section's
 * subdirectory has no content placements.
 *
 * When both a `dir` section and a `file` leaf exist for the same name
 * (e.g., `packages/cli` has both a directory and a landing page file),
 * keep the section's label but downgrade to a `file` type if no actual
 * subdirectory content exists. This prevents Rspress from expecting a
 * directory that doesn't exist on disk.
 *
 * @private
 * @param params - Merge parameters
 * @returns The section placement, possibly with its item downgraded to file type
 */
function mergeWithLeaf(params: MergeWithLeafParams): MetaPlacement {
  const { section, leaves, dirPath, allDirPaths } = params
  const sectionName = extractItemName(section.item)
  if (sectionName === null) {
    return section
  }
  // If the subdirectory has its own placements, keep as dir
  const subDirPath = resolveSubDirPath(dirPath, sectionName)
  if (allDirPaths.has(subDirPath)) {
    return section
  }
  // No subdirectory content — find matching leaf and use file type with section label
  const matchingLeaf = leaves.find((l) => extractItemName(l.item) === sectionName)
  if (matchingLeaf && typeof section.item === 'object' && 'label' in section.item) {
    return {
      ...section,
      item: { type: 'file' as const, name: sectionName, label: section.item.label },
    }
  }
  return section
}

/**
 * Build a subdirectory path from a parent dir and child name.
 *
 * @private
 * @param dirPath - Parent directory path (empty string for root)
 * @param name - Child directory name
 * @returns Full subdirectory path
 */
function resolveSubDirPath(dirPath: string, name: string): string {
  if (dirPath === '') {
    return name
  }
  return `${dirPath}/${name}`
}

/**
 * Extract the identifying name from a meta item for deduplication.
 *
 * @private
 * @param item - Meta item to extract name from
 * @returns Name string, or null for non-deduplicable items
 */
function extractItemName(item: MetaItem): string | null {
  if (typeof item === 'string') {
    return item
  }
  if ('name' in item) {
    return item.name
  }
  return null
}

/**
 * Check whether an entry has child items.
 *
 * @private
 * @param entry - Resolved entry to check
 * @returns True when the entry has a non-empty items array
 */
function hasChildren(entry: ResolvedEntry): boolean {
  return entry.items !== undefined && entry.items !== null && entry.items.length > 0
}

/**
 * Derive the content-relative directory path from an entry's link.
 *
 * @private
 * @param entry - Resolved entry with a link
 * @returns Directory path (e.g. "concepts") or null if invalid
 */
function resolveDirPath(entry: ResolvedEntry): string | null {
  if (!entry.link) {
    return null
  }
  const cleaned = stripLeadingSlash(entry.link)
  if (cleaned === '' || cleaned === '/') {
    return null
  }
  return cleaned
}

/**
 * Determine the parent directory for a leaf entry's `_meta.json` placement.
 *
 * Uses the output path's directory when available, falling back to the
 * link's parent path.
 *
 * @private
 * @param entry - Leaf entry
 * @returns Parent directory path, or null
 */
function resolveLeafParentDir(entry: ResolvedEntry): string | null {
  if (entry.page) {
    const dir = dirname(entry.page.outputPath)
    if (dir === '.') {
      return null
    }
    return dir
  }
  if (entry.link) {
    const cleaned = stripLeadingSlash(entry.link)
    const dir = dirname(cleaned)
    if (dir === '.') {
      return null
    }
    return dir
  }
  return null
}

/**
 * Convert a leaf entry to a `_meta.json` file item.
 *
 * @private
 * @param entry - Leaf resolved entry (no children)
 * @returns Meta file item with name and label
 */
function leafToMetaItem(entry: ResolvedEntry): MetaItem {
  const name = resolveFileStem(entry)
  if (name === null) {
    return entry.title
  }
  return {
    type: 'file' as const,
    name,
    label: entry.title,
  }
}

/**
 * Convert a section entry to a `_meta.json` directory item.
 *
 * @private
 * @param entry - Section resolved entry (has children)
 * @returns Meta directory item with name, label, and optional collapsed flag
 */
function sectionToMetaItem(entry: ResolvedEntry): MetaItem {
  const name = resolveDirName(entry)
  if (name === null) {
    return entry.title
  }
  return {
    type: 'dir' as const,
    name,
    label: entry.title,
    ...maybeCollapsed(entry.collapsible),
  }
}

/**
 * Extract the filename stem from a leaf entry's output path or link.
 *
 * @private
 * @param entry - Leaf entry with optional page data
 * @returns Filename stem (e.g. "deploying") or null
 */
function resolveFileStem(entry: ResolvedEntry): string | null {
  if (entry.page) {
    const ext = extname(entry.page.outputPath)
    return basename(entry.page.outputPath, ext)
  }
  if (entry.link) {
    return lastSegment(entry.link)
  }
  return null
}

/**
 * Extract the directory name from a section entry's link.
 *
 * @private
 * @param entry - Section entry with link
 * @returns Directory name (last path segment) or null
 */
function resolveDirName(entry: ResolvedEntry): string | null {
  if (entry.link) {
    return lastSegment(entry.link)
  }
  return null
}

/**
 * Return the last non-empty segment of a URL path.
 *
 * @private
 * @param link - URL path (e.g. "/guides/deploying")
 * @returns Last segment (e.g. "deploying") or null
 */
function lastSegment(link: string): string | null {
  const segments = link.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  return segments.at(-1) ?? null
}

/**
 * Return a collapsed property object if collapsible is true.
 *
 * @private
 * @param collapsible - Whether the sidebar group starts collapsed
 * @returns Object with collapsed flag, or empty object
 */
function maybeCollapsed(collapsible: boolean | undefined): { readonly collapsed?: boolean } {
  if (collapsible) {
    return { collapsed: true }
  }
  return {}
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
