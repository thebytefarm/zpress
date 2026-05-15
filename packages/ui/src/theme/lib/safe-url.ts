import { match, P } from 'ts-pattern'

const SAFE_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i

/**
 * Return `href` when it points at a safe location, otherwise `null`.
 *
 * Safe locations: relative paths, fragment anchors (`#section`),
 * absolute http/https URLs, `mailto:`, and `tel:`. Any other scheme —
 * including `javascript:`, `data:`, `vbscript:`, `file:` — returns `null`
 * so the caller can either omit the link or fall back to a placeholder.
 *
 * Validation is whitespace-trimmed and scheme detection is case-insensitive
 * so `JaVaScRiPt:` is rejected the same way `javascript:` is.
 *
 * @param href - The URL string to validate.
 * @returns The trimmed `href` when safe, or `null` when the scheme is not allowed.
 *
 * @example
 * safeUrl('/docs/intro')         // → '/docs/intro'
 * safeUrl('https://example.com') // → 'https://example.com'
 * safeUrl('javascript:alert(1)') // → null
 */
export function safeUrl(href: string): string | null {
  const trimmed = href.trim()
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
