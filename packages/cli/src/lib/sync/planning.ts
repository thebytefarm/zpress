import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { groupBy, range } from 'es-toolkit'
import fg from 'fast-glob'

import { linkToOutputPath } from './resolve/path.ts'
import { deriveText, kebabToTitle } from './resolve/text.ts'
import { stripXmlTags } from './strip-xml.ts'
import type { PageData, SyncContext } from './types.ts'

/**
 * Directory name at repo root containing planning docs.
 */
const PLANNING_DIR = '.planning'

/**
 * URL prefix for planning pages (no leading dot).
 */
const PLANNING_PREFIX = '/planning'

/**
 * Frontmatter applied to all planning pages — hides sidebar and constrains width.
 */
const PLANNING_FRONTMATTER = { sidebar: false, pageClass: 'planning-page' } as const

/**
 * Discover planning documents from the `.planning/` directory at repo root.
 *
 * Scans for `**\/*.md` files, maps each to a `/planning/<relative-slug>` route,
 * and generates a virtual index page listing all discovered docs.
 * Planning pages are intentionally excluded from sidebar and nav.
 *
 * XML-style structural tags in planning docs are stripped during copy so
 * Rspress does not attempt to render them as React components.
 *
 * @param ctx - The current sync context (provides repoRoot and outDir)
 * @returns Array of PageData for the copy pipeline; empty array if `.planning/` does not exist
 */
export async function discoverPlanningPages(ctx: SyncContext): Promise<readonly PageData[]> {
  const planningDir = path.resolve(ctx.repoRoot, PLANNING_DIR)

  if (!existsSync(planningDir)) {
    return []
  }

  const files = await fg('**/*.md', {
    cwd: planningDir,
    onlyFiles: true,
    ignore: ['**/_*'],
  })

  if (files.length === 0) {
    return []
  }

  const docPages: readonly PageData[] = files.map((relativePath) => {
    const sourcePath = path.resolve(planningDir, relativePath)
    const slug = relativePath.replace(/\.md$/, '')

    return {
      // Use content function instead of source so we can strip XML tags
      content: async () => {
        const raw = await fs.readFile(sourcePath, 'utf8')
        return stripXmlTags(raw)
      },
      outputPath: linkToOutputPath(`${PLANNING_PREFIX}/${slug}`),
      frontmatter: PLANNING_FRONTMATTER,
    } satisfies PageData
  })

  const indexPage: PageData = {
    content: () => generatePlanningIndex(files, planningDir),
    outputPath: linkToOutputPath(PLANNING_PREFIX),
    frontmatter: PLANNING_FRONTMATTER,
  }

  return [indexPage, ...docPages]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * File entry with derived title and path info.
 *
 * @private
 */
interface FileEntry {
  readonly slug: string
  readonly title: string
}

/**
 * Directory node grouping files under a heading.
 *
 * @private
 */
interface DirNode {
  readonly name: string
  readonly title: string
  readonly files: readonly FileEntry[]
}

/**
 * Enriched file entry with directory context for partitioning.
 *
 * @private
 */
interface EnrichedEntry {
  readonly slug: string
  readonly title: string
  readonly dirName: string | undefined
}

/**
 * Generate the planning index page with hierarchical layout.
 *
 * Direct children of `.planning/` appear first (e.g. `plan.md`),
 * followed by each subdirectory as a section with its own heading.
 * Files within directories are sorted naturally (numeric-aware).
 *
 * @private
 * @param files - Relative file paths discovered in the planning directory
 * @param planningDir - Absolute path to the planning directory
 * @returns Markdown string for the planning index page
 */
async function generatePlanningIndex(
  files: readonly string[],
  planningDir: string
): Promise<string> {
  // 1. Derive metadata for all files in parallel
  const entries: readonly EnrichedEntry[] = await Promise.all(
    files.map(async (relativePath) => {
      const slug = relativePath.replace(/\.md$/, '')
      const sourcePath = path.resolve(planningDir, relativePath)
      const title = await deriveText(sourcePath, path.basename(slug), 'heading')
      const segments = relativePath.split('/')

      const dirName = resolveDirName(segments)

      return { slug, title, dirName } satisfies EnrichedEntry
    })
  )

  // 2. Partition into root-level and directory-grouped (no mutation)
  const rootFiles: readonly FileEntry[] = entries
    .filter((e) => e.dirName === undefined)
    .toSorted((a, b) => naturalCompare(a.slug, b.slug))

  const grouped = groupBy(
    entries.filter((e): e is EnrichedEntry & { dirName: string } => e.dirName !== undefined),
    (e) => e.dirName
  )

  const dirs: readonly DirNode[] = Object.entries(grouped)
    .toSorted(([a], [b]) => naturalCompare(a, b))
    .map(([dirName, dirEntries]) => ({
      name: dirName,
      title: kebabToTitle(dirName),
      files: dirEntries
        .map((e): FileEntry => ({ slug: e.slug, title: e.title }))
        .toSorted((a, b) => naturalCompare(a.slug, b.slug)),
    }))

  // 3. Render markdown (no mutation — build array in one expression)
  const rootSection = resolveRootSection(rootFiles)

  const dirSections = dirs.map((dir) => {
    const heading = `## ${dir.title}\n`
    const links = dir.files.map((e) => `- [${e.title}](${PLANNING_PREFIX}/${e.slug})`).join('\n')
    return `${heading}\n${links}`
  })

  const sections = ['# Planning\n\nInternal planning documents.\n', ...rootSection, ...dirSections]

  return `${sections.join('\n\n')}\n`
}

/**
 * Natural sort comparator — numeric segments are compared by value
 * so "phase-2" sorts before "phase-10".
 *
 * @private
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Negative, zero, or positive number for sort ordering
 */
function naturalCompare(a: string, b: string): number {
  const aParts = a.split(/(\d+)/)
  const bParts = b.split(/(\d+)/)
  const len = Math.min(aParts.length, bParts.length)

  const indices = range(len)

  const result = indices.reduce<number | null>((acc, idx) => {
    if (acc !== null) {
      return acc
    }

    const aPart = aParts[idx]
    const bPart = bParts[idx]

    // Both are numeric segments
    if (/^\d+$/.test(aPart) && /^\d+$/.test(bPart)) {
      const diff = Number(aPart) - Number(bPart)
      if (diff !== 0) {
        return diff
      }
      return null
    }

    // Lexicographic comparison for non-numeric segments
    if (aPart < bPart) {
      return -1
    }
    if (aPart > bPart) {
      return 1
    }

    return null
  }, null)

  if (result !== null) {
    return result
  }

  return aParts.length - bParts.length
}

/**
 * Extract the directory name from path segments, or undefined for root-level files.
 *
 * @private
 * @param segments - Path segments split by '/'
 * @returns First segment as directory name, or undefined for single-segment paths
 */
function resolveDirName(segments: readonly string[]): string | undefined {
  if (segments.length > 1) {
    return segments[0]
  }
  return undefined
}

/**
 * Render root-level planning files as a markdown link list.
 *
 * @private
 * @param rootFiles - File entries at the planning directory root
 * @returns Array with a single markdown string, or empty if no root files
 */
function resolveRootSection(rootFiles: readonly FileEntry[]): readonly string[] {
  if (rootFiles.length === 0) {
    return []
  }
  return [rootFiles.map((e) => `- [${e.title}](${PLANNING_PREFIX}/${e.slug})`).join('\n')]
}
