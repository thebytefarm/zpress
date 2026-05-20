import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { ResolvedEntry } from '../types'

vi.mock(import('node:fs/promises'), () => ({
  default: {
    readFile: vi
      .fn<() => Promise<string>>()
      .mockResolvedValue('---\n---\nSome description paragraph'),
  },
}))

const { buildWorkspaceCardJsx, generateLandingContent } = await import('./landing')

function mockEntry(overrides: Partial<ResolvedEntry> = {}): ResolvedEntry {
  return {
    title: 'Test Entry',
    link: '/test',
    page: { outputPath: 'test.md', frontmatter: {} },
    ...overrides,
  }
}

describe('buildWorkspaceCardJsx()', () => {
  it('should generate card with title and href', () => {
    const result = buildWorkspaceCardJsx({ title: 'My Doc', link: '/docs/my-doc' })
    expect(result).toContain('title="My Doc"')
    expect(result).toContain('href="/docs/my-doc"')
  })

  it('should default icon to pixelarticons:file when hasChildren is false', () => {
    const result = buildWorkspaceCardJsx({ title: 'Doc', link: '/doc', hasChildren: false })
    expect(result).toContain('icon="pixelarticons:file"')
  })

  it('should default icon to pixelarticons:folder when hasChildren is true', () => {
    const result = buildWorkspaceCardJsx({ title: 'Section', link: '/section', hasChildren: true })
    expect(result).toContain('icon="pixelarticons:folder"')
  })

  it('should use provided icon when specified', () => {
    const result = buildWorkspaceCardJsx({ title: 'Doc', link: '/doc', icon: 'devicon:react' })
    expect(result).toContain('icon="devicon:react"')
  })

  it('should default icon color to purple (plain string)', () => {
    const result = buildWorkspaceCardJsx({ title: 'Doc', link: '/doc' })
    expect(result).toContain('icon="pixelarticons:file"')
    expect(result).not.toContain('color')
  })

  it('should serialize object icon with color', () => {
    const result = buildWorkspaceCardJsx({
      title: 'Doc',
      link: '/doc',
      icon: { id: 'devicon:react', color: 'blue' },
    })
    expect(result).toContain('icon={{ id: "devicon:react", color: "blue" }}')
  })

  it('should include scope prop when provided', () => {
    const result = buildWorkspaceCardJsx({ title: 'Doc', link: '/doc', scope: 'apps/' })
    expect(result).toContain('scope="apps/"')
  })

  it('should include description prop when provided', () => {
    const result = buildWorkspaceCardJsx({
      title: 'Doc',
      link: '/doc',
      description: 'A short desc',
    })
    expect(result).toContain('description="A short desc"')
  })

  it('should include tags prop when provided', () => {
    const result = buildWorkspaceCardJsx({
      title: 'Doc',
      link: '/doc',
      tags: ['react', 'typescript'],
    })
    expect(result).toContain('tags={["react","typescript"]}')
  })

  it('should include badge prop when provided', () => {
    const result = buildWorkspaceCardJsx({
      title: 'Doc',
      link: '/doc',
      badge: { src: 'https://img.shields.io/badge/deploy-passing', alt: 'deploy' },
    })
    expect(result).toContain('badge={')
    expect(result).toContain('"src":"https://img.shields.io/badge/deploy-passing"')
    expect(result).toContain('"alt":"deploy"')
  })
})

describe('generateLandingContent()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include import statement for components', async () => {
    const result = await generateLandingContent('My Section', undefined, [mockEntry()], 'blue')
    expect(result).toContain(
      "import { WorkspaceCard, WorkspaceGrid, SectionCard, SectionGrid } from '@zpress/ui/theme'"
    )
  })

  it('should include section heading', async () => {
    const result = await generateLandingContent('My Section', undefined, [mockEntry()], 'blue')
    expect(result).toContain('# My Section')
  })

  it('should include description when provided', async () => {
    const result = await generateLandingContent(
      'My Section',
      'Overview of this section',
      [mockEntry()],
      'blue'
    )
    expect(result).toContain('Overview of this section')
  })

  it('should filter out hidden children', async () => {
    const visible = mockEntry({ title: 'Visible', link: '/visible' })
    const hidden = mockEntry({ title: 'Hidden', link: '/hidden', hidden: true })
    const result = await generateLandingContent('My Section', undefined, [visible, hidden], 'blue')
    expect(result).toContain('href="/visible"')
    expect(result).not.toContain('href="/hidden"')
  })

  it('should generate section cards when no child has card metadata', async () => {
    const result = await generateLandingContent('My Section', undefined, [mockEntry()], 'blue')
    expect(result).toContain('<SectionGrid>')
    expect(result).toContain('<SectionCard ')
  })
})
