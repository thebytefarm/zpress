import fs from 'node:fs/promises'

import type { Section } from '@zpress/config'
import { capitalize, words } from 'es-toolkit'
import { match, P } from 'ts-pattern'

import { parse as parseFrontmatter } from '../frontmatter.ts'

/**
 * Derive display text for a page.
 *
 * - `'auto'` (default) — frontmatter > heading > filename fallback chain
 * - `'filename'` — kebab-to-title from the slug
 * - `'heading'` — first `# heading` in the file, falls back to filename
 * - `'frontmatter'` — `title` from YAML frontmatter only, falls back to heading
 *
 * @param sourcePath - Absolute path to the source markdown file
 * @param slug - Filename slug (without extension)
 * @param mode - Text derivation strategy
 * @returns Derived display text for sidebar/nav
 */
export function deriveText(
  sourcePath: string,
  slug: string,
  mode: 'auto' | 'filename' | 'heading' | 'frontmatter'
): Promise<string> {
  return match(mode)
    .with('auto', () => deriveFromFrontmatter(sourcePath, slug))
    .with('frontmatter', () => deriveFromFrontmatter(sourcePath, slug))
    .with('heading', () => deriveFromHeading(sourcePath, slug))
    .with('filename', () => Promise.resolve(kebabToTitle(slug)))
    .exhaustive()
}

/**
 * Resolve a display title for a section header.
 *
 * When `title` is a string, returns it directly.
 * When `title` is a TitleConfig object (e.g. `{ from: 'heading' }`),
 * derives a human-readable name from the path's last segment.
 * Falls back to `'Section'` only when no path is available.
 *
 * @param section - Section with title and optional path
 * @returns Display title string
 */
export function resolveSectionTitle(section: Section): string {
  return match(section.title)
    .with(P.string, (t) => t)
    .otherwise(() => {
      const prefix = section.path
      const lastSegment = match(prefix)
        .with(P.string, (p) => p.split('/').findLast(Boolean))
        .otherwise(() => '')
      return match(lastSegment)
        .with(P.string, kebabToTitle)
        .otherwise(() => 'Section')
    })
}

/**
 * Convert a kebab-case slug to title case.
 *
 * @param slug - Kebab-case string (e.g. `"add-api-route"`)
 * @returns Title-cased string (e.g. `"Add Api Route"`)
 */
export function kebabToTitle(slug: string): string {
  return words(slug).map(capitalize).join(' ')
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Derive text from YAML frontmatter `title` field, falling back to first heading,
 * then to filename. Reads the file once and reuses the content for heading extraction.
 *
 * @private
 * @param sourcePath - Absolute path to the markdown file
 * @param fallbackSlug - Slug to use when no title or heading is found
 * @returns Derived display text
 */
async function deriveFromFrontmatter(sourcePath: string, fallbackSlug: string): Promise<string> {
  const content = await fs.readFile(sourcePath, 'utf8')
  const parsed = parseFrontmatter(content)

  return match(parsed.data.title)
    .with(P.string.minLength(1), (title) => title)
    .otherwise(() => extractHeading(parsed.content, fallbackSlug))
}

/**
 * Derive text from the first `# heading` in the file.
 * Falls back to kebab-to-title of the slug when no heading is found.
 *
 * @private
 * @param sourcePath - Absolute path to the markdown file
 * @param fallbackSlug - Slug to use when no heading is found
 * @returns Heading text or title-cased slug
 */
async function deriveFromHeading(sourcePath: string, fallbackSlug: string): Promise<string> {
  const content = await fs.readFile(sourcePath, 'utf8')
  const { content: body } = parseFrontmatter(content)
  return extractHeading(body, fallbackSlug)
}

/**
 * Extract the first `# heading` from markdown body content.
 * Falls back to kebab-to-title of the slug when no heading is found.
 *
 * @private
 * @param body - Markdown content with frontmatter already stripped
 * @param fallbackSlug - Slug to use when no heading is found
 * @returns Heading text or title-cased slug
 */
function extractHeading(body: string, fallbackSlug: string): string {
  const heading = body.match(/^#\s+(.+)$/m)
  return match(heading)
    .with(P.nonNullable, (h) => h[1].trim())
    .otherwise(() => kebabToTitle(fallbackSlug))
}
