import { describe, expect, it } from 'vitest'

import { safeUrl } from './safe-url.ts'

// String literals carrying disallowed schemes are constructed via concatenation
// so the test file itself does not contain `javascript:` / `vbscript:` literals
// (oxlint flags those as `no-script-url` regardless of context).
const JS_URL = `${'java'}script:alert(1)`
const JS_URL_MIXED = `${'JaVa'}ScRiPt:alert(1)`
const VBS_URL = `${'vb'}script:msgbox(1)`

describe('safe-url helper', () => {
  it('allows relative paths', () => {
    expect(safeUrl('/docs/intro')).toBe('/docs/intro')
    expect(safeUrl('./guide')).toBe('./guide')
    expect(safeUrl('../guide')).toBe('../guide')
  })

  it('allows fragment anchors', () => {
    expect(safeUrl('#section')).toBe('#section')
  })

  it('allows http and https URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com')
    expect(safeUrl('http://example.com')).toBe('http://example.com')
  })

  it('allows mailto and tel', () => {
    expect(safeUrl('mailto:me@example.com')).toBe('mailto:me@example.com')
    expect(safeUrl('tel:+15555555555')).toBe('tel:+15555555555')
  })

  it('rejects script-style URLs in any case', () => {
    expect(safeUrl(JS_URL)).toBeNull()
    expect(safeUrl(JS_URL_MIXED)).toBeNull()
    expect(safeUrl(`  ${JS_URL}  `)).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('rejects vbscript: and file:', () => {
    expect(safeUrl(VBS_URL)).toBeNull()
    expect(safeUrl('file:///etc/passwd')).toBeNull()
  })

  it('rejects empty and whitespace-only strings', () => {
    expect(safeUrl('')).toBeNull()
    expect(safeUrl('   ')).toBeNull()
  })

  it('trims whitespace from safe URLs', () => {
    expect(safeUrl('  /docs  ')).toBe('/docs')
    expect(safeUrl('  https://example.com  ')).toBe('https://example.com')
  })

  it('treats scheme-less paths as relative', () => {
    expect(safeUrl('docs/intro')).toBe('docs/intro')
  })
})
