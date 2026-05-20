import { describe, it, expect } from 'vitest'

import { extractBaseDir, linkToOutputPath, sourceExt } from './resolve/path'

describe('linkToOutputPath()', () => {
  it('should strip leading slash and append .md extension', () => {
    expect(linkToOutputPath('/guides/start')).toBe('guides/start.md')
  })

  it('should use provided extension override', () => {
    expect(linkToOutputPath('/guides/start', '.mdx')).toBe('guides/start.mdx')
  })

  it('should return index.md for empty string', () => {
    expect(linkToOutputPath('')).toBe('index.md')
  })

  it('should return index.md for root slash', () => {
    expect(linkToOutputPath('/')).toBe('index.md')
  })
})

describe('sourceExt()', () => {
  it('should return .mdx for .mdx files', () => {
    expect(sourceExt('file.mdx')).toBe('.mdx')
  })

  it('should return .md for .md files', () => {
    expect(sourceExt('file.md')).toBe('.md')
  })

  it('should return .md for non-markdown extensions', () => {
    expect(sourceExt('file.txt')).toBe('.md')
  })
})

describe('extractBaseDir()', () => {
  it('should extract static base directory before glob wildcard', () => {
    expect(extractBaseDir('docs/guides/*.md')).toBe('docs/guides')
  })

  it('should return dirname when no glob characters are present', () => {
    expect(extractBaseDir('docs/file.md')).toBe('docs')
  })
})
