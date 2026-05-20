import { describe, it, expect } from 'vitest'

import type { ResolvedPage } from '../types'
import { sortEntries } from './resolve/sort'
import type { ResolvedEntry } from './types'

function reverseComparator(a: ResolvedPage, b: ResolvedPage): number {
  return b.title.localeCompare(a.title)
}

describe('sortEntries()', () => {
  const leafA: ResolvedEntry = {
    title: 'Zebra',
    page: { outputPath: 'z-page.md', frontmatter: {} },
  }

  const leafB: ResolvedEntry = {
    title: 'Apple',
    page: { outputPath: 'a-page.md', frontmatter: {} },
  }

  const leafC: ResolvedEntry = {
    title: 'Mango',
    page: { outputPath: 'm-page.md', frontmatter: {} },
  }

  const section: ResolvedEntry = {
    title: 'Beta Section',
    items: [leafA],
  }

  it('should apply default sort (pinned first, then alpha) when no sort is provided', () => {
    const entries: readonly ResolvedEntry[] = [leafA, leafB, leafC]
    const result = sortEntries(entries)
    expect(result.map((e) => e.title)).toStrictEqual(['Apple', 'Mango', 'Zebra'])
    expect(result).not.toBe(entries)
  })

  it('should sort alphabetically by title with sections first for alpha sort', () => {
    const entries: readonly ResolvedEntry[] = [leafC, section, leafA, leafB]
    const result = sortEntries(entries, 'alpha')
    expect(result[0]).toBe(section)
    expect(result.slice(1).map((e) => e.title)).toStrictEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('should sort by outputPath with sections first for filename sort', () => {
    const entries: readonly ResolvedEntry[] = [leafC, section, leafA, leafB]
    const result = sortEntries(entries, 'filename')
    expect(result[0]).toBe(section)
    expect(
      result.slice(1).map((e) => {
        if (e.page) {
          return e.page.outputPath
        }
        return ''
      })
    ).toStrictEqual(['a-page.md', 'm-page.md', 'z-page.md'])
  })

  it('should use custom comparator function when provided', () => {
    const entries: readonly ResolvedEntry[] = [leafA, leafB, leafC]
    const result = sortEntries(entries, reverseComparator)
    expect(result.map((e) => e.title)).toStrictEqual(['Zebra', 'Mango', 'Apple'])
  })
})
