import { describe, expect, it } from 'vitest'

import { parse, stringify } from './frontmatter.ts'

describe('parse()', () => {
  it('should return empty data and the original content when no frontmatter is present', () => {
    const result = parse('# Hello\nworld\n')
    expect(result.data).toStrictEqual({})
    expect(result.content).toBe('# Hello\nworld\n')
  })

  it('should parse a basic frontmatter block', () => {
    const result = parse('---\ntitle: Hello\n---\n# Body\n')
    expect(result.data).toStrictEqual({ title: 'Hello' })
    expect(result.content).toBe('# Body\n')
  })

  it('should parse multiple typed fields', () => {
    const raw = '---\ntitle: Hello\nsidebar: false\noutline: 2\n---\nBody'
    const result = parse(raw)
    expect(result.data).toStrictEqual({ title: 'Hello', sidebar: false, outline: 2 })
    expect(result.content).toBe('Body')
  })

  it('should treat unknown fields as plain Record<string, unknown>', () => {
    const result = parse('---\norder: 5\ncustom: { nested: true }\n---\nBody')
    expect(result.data).toStrictEqual({ order: 5, custom: { nested: true } })
  })

  it('should strip a leading UTF-8 BOM before scanning', () => {
    const raw = '﻿---\ntitle: Hello\n---\nBody'
    const result = parse(raw)
    expect(result.data).toStrictEqual({ title: 'Hello' })
    expect(result.content).toBe('Body')
  })

  it('should handle CRLF line endings', () => {
    const raw = '---\r\ntitle: Hello\r\n---\r\nBody'
    const result = parse(raw)
    expect(result.data).toStrictEqual({ title: 'Hello' })
    expect(result.content).toBe('Body')
  })

  it('should return empty data when the YAML block is whitespace only', () => {
    const result = parse('---\n\n---\nBody')
    expect(result.data).toStrictEqual({})
    expect(result.content).toBe('Body')
  })

  it('should treat a bare `---` (no closing delimiter) as no frontmatter', () => {
    const raw = '---\ntitle: Hello\nBody'
    const result = parse(raw)
    expect(result.data).toStrictEqual({})
    expect(result.content).toBe(raw)
  })

  it('should return empty data when YAML parses to a non-object (e.g. an array)', () => {
    const result = parse('---\n- one\n- two\n---\nBody')
    expect(result.data).toStrictEqual({})
    expect(result.content).toBe('Body')
  })
})

describe('stringify()', () => {
  it('should return content unchanged when data is empty', () => {
    expect(stringify('# Body\n', {})).toBe('# Body\n')
  })

  it('should emit a canonical YAML block when data has keys', () => {
    expect(stringify('# Body\n', { title: 'Hello' })).toBe('---\ntitle: Hello\n---\n# Body\n')
  })

  it('should round-trip through parse()', () => {
    const data = { title: 'Hello', sidebar: false, outline: 2 }
    const serialised = stringify('Body', data)
    const parsed = parse(serialised)
    expect(parsed.data).toStrictEqual(data)
    expect(parsed.content).toBe('Body')
  })

  it('should handle nested objects in data', () => {
    const data = { head: [['meta', { name: 'desc', content: 'x' }]] }
    const parsed = parse(stringify('Body', data))
    expect(parsed.data).toStrictEqual(data)
  })
})
