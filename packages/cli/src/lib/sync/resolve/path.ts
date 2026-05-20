import { dirname, extname } from 'node:path'

import { match } from 'ts-pattern'

/**
 * Slugs that identify entry/overview pages, in priority order.
 *
 * Used by the sort comparator (pinned-first) and by auto-nav resolution
 * to prefer a real content page over a generated landing page.
 */
export const ENTRY_SLUGS = ['introduction', 'intro', 'overview', 'index', 'readme'] as const

/**
 * Check whether a URL-style link ends with a known entry-page slug.
 *
 * @param link - URL path (e.g. "/guides/overview")
 * @returns True when the last segment matches an entry slug
 */
export function isEntrySlug(link: string): boolean {
  const last = link.split('/').pop()
  if (!last) {
    return false
  }
  return (ENTRY_SLUGS as readonly string[]).includes(last.toLowerCase())
}

/**
 * Return the priority index of an entry slug, or -1 if not an entry slug.
 *
 * Lower values indicate higher priority (introduction > intro > overview > index > readme).
 *
 * @param slug - Bare filename stem (e.g. "overview", "readme")
 * @returns Index in ENTRY_SLUGS, or -1
 */
export function entrySlugRank(slug: string): number {
  return (ENTRY_SLUGS as readonly string[]).indexOf(slug.toLowerCase())
}

/**
 * Convert "/guides/add-api-route" → "guides/add-api-route.md"
 *
 * Accepts an optional extension override (e.g. `'.mdx'`) to preserve
 * the source file format through to the output path.
 *
 * @param link - URL-style link path (e.g. "/guides/add-api-route")
 * @param ext - Output file extension (defaults to ".md")
 * @returns Relative output path with extension (e.g. "guides/add-api-route.md")
 */
export function linkToOutputPath(link: string, ext = '.md'): string {
  const clean = match(link.startsWith('/'))
    .with(true, () => link.slice(1))
    .otherwise(() => link)
  if (clean === '' || clean === '/') {
    return `index${ext}`
  }
  return `${clean}${ext}`
}

/**
 * Return the output extension for a source file path.
 *
 * Preserves `.mdx` when present so Rspress processes the file through
 * the MDX pipeline. All other extensions default to `.md`.
 *
 * @param filePath - Absolute or relative path to a source file
 * @returns ".mdx" for MDX files, ".md" for everything else
 */
export function sourceExt(filePath: string): string {
  return match(extname(filePath))
    .with('.mdx', () => '.mdx')
    .otherwise(() => '.md')
}

/**
 * Extract the static base directory from a glob pattern.
 *
 * @param globPattern - Glob pattern to extract the base from
 * @returns Static directory path before any glob characters
 */
export function extractBaseDir(globPattern: string): string {
  const firstGlobChar = globPattern.search(/[*?{}[\]]/)
  if (firstGlobChar === -1) {
    return dirname(globPattern)
  }
  const beforeGlob = globPattern.slice(0, firstGlobChar)
  return match(beforeGlob.endsWith('/'))
    .with(true, () => beforeGlob.slice(0, -1))
    .otherwise(() => dirname(beforeGlob))
}
