import { basename, extname } from 'node:path'

import type { ResolvedPage } from '@zpress/config'
import { match, P } from 'massaman/match'

import type { ResolvedEntry } from '../types.ts'
import { entrySlugRank } from './path.ts'

/**
 * Sort resolved entries using the specified strategy.
 *
 * Sections (entries with children) always sort before leaf pages.
 * When no sort strategy is provided, entries are sorted with pinned entry-style
 * files first (see `ENTRY_SLUGS`), then alpha by title.
 *
 * @param entries - Entries to sort
 * @param sort - Sort strategy: `"default"` (pinned + alpha), `"alpha"` by text, `"filename"` by output path, or custom comparator
 * @returns Sorted copy of the entries array
 */
export function sortEntries(
  entries: readonly ResolvedEntry[],
  sort:
    | 'default'
    | 'alpha'
    | 'filename'
    | 'none'
    | ((a: ResolvedPage, b: ResolvedPage) => number) = 'default'
): ResolvedEntry[] {
  return match(sort)
    .with('none', () => [...entries])
    .with('default', () => entries.toSorted(defaultCompare))
    .with('alpha', () =>
      entries.toSorted((a, b) => sectionFirst(a, b) || a.title.localeCompare(b.title))
    )
    .with('filename', () =>
      entries.toSorted((a, b) => {
        const rank = sectionFirst(a, b)
        if (rank !== 0) {
          return rank
        }
        const aKey = match(a.page)
          .with(P.nonNullable, (p) => p.outputPath)
          .otherwise(() => a.title)
        const bKey = match(b.page)
          .with(P.nonNullable, (p) => p.outputPath)
          .otherwise(() => b.title)
        return aKey.localeCompare(bKey)
      })
    )
    .otherwise((comparator) =>
      entries.toSorted((a, b) => comparator(toResolvedPage(a), toResolvedPage(b)))
    )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Default comparator: sections first, then pinned intro files, then alpha by title.
 *
 * @private
 * @param a - First entry to compare
 * @param b - Second entry to compare
 * @returns Standard comparator result
 */
function defaultCompare(a: ResolvedEntry, b: ResolvedEntry): number {
  return sectionFirst(a, b) || pinnedFirst(a, b) || a.title.localeCompare(b.title)
}

/**
 * Return 0 for sections (entries with children), 1 for leaf pages.
 *
 * @private
 * @param entry - Entry to rank
 * @returns 0 if section, 1 if leaf
 */
function sectionRank(entry: ResolvedEntry): number {
  if (entry.items !== undefined && entry.items.length > 0) {
    return 0
  }
  return 1
}

/**
 * Sections (entries with items) sort before leaf pages.
 *
 * @private
 * @param a - First entry to compare
 * @param b - Second entry to compare
 * @returns Negative if a is a section, positive if b is, zero if equal
 */
function sectionFirst(a: ResolvedEntry, b: ResolvedEntry): number {
  return sectionRank(a) - sectionRank(b)
}

/**
 * Rank an entry by its pinned stem position, returning -1 if not pinned.
 *
 * @private
 * @param entry - Entry to rank
 * @returns Index in ENTRY_SLUGS, or -1 if not a pinned file
 */
function pinnedRank(entry: ResolvedEntry): number {
  if (!entry.page) {
    return -1
  }
  const { source } = entry.page
  if (!source) {
    return -1
  }
  const stem = basename(source, extname(source))
  return entrySlugRank(stem)
}

/**
 * Sort pinned entry-style files before all others, preserving their relative order.
 *
 * @private
 * @param a - First entry to compare
 * @param b - Second entry to compare
 * @returns Negative if a is pinned first, positive if b is, zero if equal priority
 */
function pinnedFirst(a: ResolvedEntry, b: ResolvedEntry): number {
  const aRank = pinnedRank(a)
  const bRank = pinnedRank(b)
  if (aRank !== -1 && bRank !== -1) {
    return aRank - bRank
  }
  if (aRank !== -1) {
    return -1
  }
  if (bRank !== -1) {
    return 1
  }
  return 0
}

/**
 * Convert a ResolvedEntry to a ResolvedPage for custom sort comparators.
 *
 * @private
 * @param entry - Resolved entry to convert
 * @returns Resolved page shape with title, link, source, and frontmatter
 */
function toResolvedPage(entry: ResolvedEntry): ResolvedPage {
  const page = match(entry.page)
    .with(P.nonNullable, (p) => ({ source: p.source, frontmatter: p.frontmatter }))
    .otherwise(() => ({ source: undefined, frontmatter: {} }))
  return {
    title: entry.title,
    link: match(entry.link)
      .with(P.nonNullable, (l) => l)
      .otherwise(() => ''),
    source: page.source,
    frontmatter: page.frontmatter,
  }
}
