/**
 * Standard HTML elements that Rspress renders natively.
 *
 * Tags in this set are preserved during XML stripping so they
 * appear in the final output (e.g. `<details>` accordions).
 */
const PRESERVED_HTML_TAGS: ReadonlySet<string> = new Set([
  // Interactive / sectioning
  'details',
  'summary',
  'dialog',
  // Block-level
  'div',
  'p',
  'blockquote',
  'pre',
  'figure',
  'figcaption',
  'hr',
  'br',
  // Headings
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // Inline formatting
  'span',
  'a',
  'em',
  'strong',
  'code',
  'del',
  'ins',
  'mark',
  'sub',
  'sup',
  'kbd',
  'abbr',
  'small',
  // Media
  'img',
  'video',
  'audio',
  'source',
  'picture',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // Lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
])

/**
 * Strip custom XML tags from markdown while preserving code blocks
 * and standard HTML elements.
 *
 * Planning documents use XML-style structural tags (`<tasks>`, `<task>`,
 * `<status>`, `<criterion>`, etc.) that Rspress interprets as React
 * components. This strips those tags while keeping their text content,
 * standard HTML elements (like `<details>` accordions), and fenced
 * code blocks untouched.
 *
 * @param markdown - Raw markdown string potentially containing XML tags
 * @returns Cleaned markdown with custom XML tags removed
 */
export function stripXmlTags(markdown: string): string {
  // Split on fenced code blocks — odd indices are code blocks
  const parts = markdown.split(/(```[\s\S]*?```)/g)

  const stripped = parts
    .map((part, i) => {
      if (i % 2 === 1) {
        return part
      }
      return part.replaceAll(/<\/?([a-zA-Z][\w-]*)[^>]*>/g, (tag, name: string) => {
        if (PRESERVED_HTML_TAGS.has(name.toLowerCase())) {
          return tag
        }
        return ''
      })
    })
    .join('')

  // Collapse runs of 3+ blank lines left behind by removed container tags
  return stripped.replaceAll(/\n{3,}/g, '\n\n')
}
