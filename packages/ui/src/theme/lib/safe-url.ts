import { match, P } from 'massaman/match'

const SAFE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i

// ASCII whitespace + control characters that browsers strip when
// normalising URL schemes — U+0000–U+0020 (NUL through SPACE) plus
// U+007F (DEL). A href like `java\nscript:alert(1)` or `java script:`
// looks "relative" to a naive scheme regex but resolves to
// `javascript:` once a browser parses it for navigation. We reject any
// such character anywhere in the input as the cheap fix.
// oxlint-disable-next-line no-control-regex -- matching control chars is the point
const FORBIDDEN_CHARS_PATTERN = /[\u0000-\u0020\u007F]/u

/**
 * Return `href` when it points at a safe location, otherwise `null`.
 *
 * Safe locations: relative paths, fragment anchors (`#section`),
 * absolute http/https URLs, `mailto:`, and `tel:`. Any other scheme —
 * including `javascript:`, `data:`, `vbscript:`, `file:` — returns `null`
 * so the caller can either omit the link or fall back to a placeholder.
 *
 * Inputs containing ASCII whitespace or control characters (newline, tab,
 * carriage return, space) anywhere are rejected outright — browsers strip
 * those during URL normalisation, so a value like `"java\nscript:alert(1)"`
 * resolves to `javascript:` post-parse even though the scheme regex won't
 * catch it. This is the documented bypass for naïve allow-lists.
 *
 * Validation is whitespace-trimmed and scheme detection is case-insensitive
 * so `JaVaScRiPt:` is rejected the same way `javascript:` is.
 *
 * @param href - The URL string to validate.
 * @returns The trimmed `href` when safe, or `null` when the scheme is not allowed.
 *
 * @example
 * safeUrl('/docs/intro')            // → '/docs/intro'
 * safeUrl('https://example.com')    // → 'https://example.com'
 * safeUrl('javascript:alert(1)')    // → null
 * safeUrl('java\nscript:alert(1)')  // → null  (control-char smuggling)
 * safeUrl('java script:alert(1)')   // → null  (whitespace smuggling)
 */
export function safeUrl(href: string): string | null {
  // Trim outer whitespace first so `'  /docs  '` survives, but any
  // whitespace or control character INSIDE the value is treated as
  // scheme-smuggling and rejected.
  const trimmed = href.trim()
  if (FORBIDDEN_CHARS_PATTERN.test(trimmed)) {
    return null
  }
  return match(trimmed)
    .with('', () => null)
    .with(P.string.startsWith('#'), () => trimmed)
    .with(P.string.startsWith('/'), () => trimmed)
    .with(P.string.startsWith('./'), () => trimmed)
    .with(P.string.startsWith('../'), () => trimmed)
    .otherwise(() => {
      const match_ = trimmed.match(PROTOCOL_PATTERN)
      if (!match_) {
        return trimmed
      }
      const scheme = match_[0].toLowerCase()
      if (SAFE_PROTOCOLS.has(scheme)) {
        return trimmed
      }
      return null
    })
}
