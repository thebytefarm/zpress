import type { ZpressConfig } from '@zpress/config'
import { describe, expect, it } from 'vitest'

import type { ResolvedEntry } from '../types.ts'
import { generateNav } from './index.ts'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const autoConfig = { nav: 'auto' } as ZpressConfig

// ---------------------------------------------------------------------------
// generateNav — root sections
// ---------------------------------------------------------------------------

describe('generateNav()', () => {
  it('should exclude root sections from non-standalone nav items', () => {
    const entries: readonly ResolvedEntry[] = [
      { title: 'Guide', link: '/guide', items: [{ title: 'Intro', link: '/guide/intro' }] },
      {
        title: 'Reference',
        link: '/references',
        root: true,
        items: [
          { title: 'API', link: '/references/api', items: [] },
          { title: 'CLI', link: '/references/cli', items: [] },
        ],
      },
    ]

    const nav = generateNav(autoConfig, entries)
    const texts = nav.map((item) => item.text)

    expect(texts).toContain('Guide')
    expect(texts).toContain('Reference')
  })

  it('should produce dropdown children for root sections', () => {
    const entries: readonly ResolvedEntry[] = [
      {
        title: 'Reference',
        link: '/references',
        root: true,
        items: [
          { title: 'API', link: '/references/api', items: [] },
          { title: 'CLI', link: '/references/cli', items: [] },
        ],
      },
    ]

    const nav = generateNav(autoConfig, entries)
    const refItem = nav.find((item) => item.text === 'Reference')

    expect(refItem).toBeDefined()
    expect(refItem).toHaveProperty('items')
    const childTexts = (
      refItem as { readonly items: readonly { readonly text: string }[] }
    ).items.map((c) => c.text)
    expect(childTexts).toStrictEqual(['API', 'CLI'])
  })

  it('should not count root sections toward the 3 non-standalone limit', () => {
    const entries: readonly ResolvedEntry[] = [
      { title: 'A', link: '/a', items: [{ title: 'A1', link: '/a/1' }] },
      { title: 'B', link: '/b', items: [{ title: 'B1', link: '/b/1' }] },
      { title: 'C', link: '/c', items: [{ title: 'C1', link: '/c/1' }] },
      { title: 'D', link: '/d', items: [{ title: 'D1', link: '/d/1' }] },
      {
        title: 'Ref',
        link: '/ref',
        root: true,
        items: [{ title: 'API', link: '/ref/api', items: [] }],
      },
    ]

    const nav = generateNav(autoConfig, entries)
    const texts = nav.map((item) => item.text)

    // First 3 non-standalone + root section
    expect(texts).toStrictEqual(['A', 'B', 'C', 'Ref'])
    expect(texts).not.toContain('D')
  })
})
