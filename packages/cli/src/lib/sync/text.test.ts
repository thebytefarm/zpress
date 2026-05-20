import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock(import('node:fs/promises'), () => ({
  default: {
    readFile: vi.fn<() => Promise<string>>(),
  },
}))

const fs = await import('node:fs/promises')
const { deriveText, kebabToTitle } = await import('./resolve/text')

describe('kebabToTitle()', () => {
  it('should convert multi-word kebab slug to title case', () => {
    expect(kebabToTitle('add-api-route')).toBe('Add Api Route')
  })

  it('should convert single word slug to capitalized', () => {
    expect(kebabToTitle('hello')).toBe('Hello')
  })

  it('should convert each segment of a-b-c to title case', () => {
    expect(kebabToTitle('a-b-c')).toBe('A B C')
  })
})

describe('deriveText()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return kebabToTitle result for filename mode without reading files', async () => {
    const result = await deriveText('/some/path/add-api-route.md', 'add-api-route', 'filename')
    expect(result).toBe('Add Api Route')
    expect(vi.mocked(fs.default.readFile)).not.toHaveBeenCalled()
  })

  it('should extract title from frontmatter for frontmatter mode', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue(
      '---\ntitle: My Title\n---\n# Heading\nContent' as never
    )
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'frontmatter')
    expect(result).toBe('My Title')
  })

  it('should fall back to heading when frontmatter has no title in frontmatter mode', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue('---\n---\n# Heading Text\nContent' as never)
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'frontmatter')
    expect(result).toBe('Heading Text')
  })

  it('should extract first heading for heading mode', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue(
      '---\ntitle: Ignore Me\n---\n# Heading Text\nContent' as never
    )
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'heading')
    expect(result).toBe('Heading Text')
  })

  it('should fall back to kebabToTitle when no heading exists in heading mode', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue('---\n---\nJust content' as never)
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'heading')
    expect(result).toBe('My Page')
  })

  it('should try frontmatter first for auto mode and return title when present', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue(
      '---\ntitle: Auto Title\n---\n# Heading\nContent' as never
    )
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'auto')
    expect(result).toBe('Auto Title')
  })

  it('should fall back to heading in auto mode when frontmatter title is absent', async () => {
    vi.mocked(fs.default.readFile).mockResolvedValue('---\n---\n# Heading Text\nContent' as never)
    const result = await deriveText('/some/path/my-page.md', 'my-page', 'auto')
    expect(result).toBe('Heading Text')
  })
})
