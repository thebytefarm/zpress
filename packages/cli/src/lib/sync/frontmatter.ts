import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const BOM = '﻿'
const EMPTY_DATA: Readonly<Record<string, unknown>> = Object.freeze({})

/**
 * Result of {@link parse} — the YAML frontmatter block as a plain object
 * and the remaining markdown body.
 *
 * `data` is `Record<string, unknown>` rather than `Frontmatter` because
 * source files may carry arbitrary YAML keys; the typed `Frontmatter`
 * surface only applies to config-time injection. Callers narrow as needed.
 */
export interface ParsedFrontmatter {
  readonly data: Readonly<Record<string, unknown>>
  readonly content: string
}

/**
 * Parse a markdown string into its YAML frontmatter block (if any) and
 * the remaining body content.
 *
 * Drop-in replacement for `gray-matter`'s default callable export, with
 * the same behavioural contract for our usage:
 *  - Recognises `---\n…\n---\n` (and `\r\n` line endings) at the very start.
 *  - When no frontmatter block is present, returns `{ data: {}, content: raw }`.
 *  - Strips a leading UTF-8 BOM before scanning.
 *
 * Built on `yaml` (eemeli/yaml) — actively maintained, YAML 1.2 spec-
 * compliant, zero dependencies.
 *
 * @param raw - Raw markdown source (possibly with a leading frontmatter block)
 * @returns The parsed YAML data and the body content after the frontmatter
 *
 * @example
 * const { data, content } = parse('---\ntitle: Hello\n---\n# Body\n')
 * // data => { title: 'Hello' }
 * // content => '# Body\n'
 */
export function parse(raw: string): ParsedFrontmatter {
  const stripped = stripBom(raw)
  const match = stripped.match(FRONTMATTER_PATTERN)
  if (match === null) {
    return { data: EMPTY_DATA, content: stripped }
  }
  const yamlBody = match[1] ?? ''
  const content = stripped.slice(match[0].length)
  if (yamlBody.trim().length === 0) {
    return { data: EMPTY_DATA, content }
  }
  const parsed = parseYaml(yamlBody) as unknown
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { data: EMPTY_DATA, content }
  }
  return { data: parsed as Record<string, unknown>, content }
}

/**
 * Serialise content + frontmatter data back into a single markdown string.
 *
 * Drop-in replacement for `gray-matter`'s `matter.stringify(content, data)`:
 *  - When `data` has no enumerable keys, the body is returned unchanged
 *    (no empty `---\n---\n` block is emitted).
 *  - Otherwise, the YAML block is prepended in the canonical
 *    `---\n<yaml>\n---\n<content>` form.
 *
 * @param content - The markdown body to append after the frontmatter block
 * @param data - Frontmatter key-value pairs to serialise as YAML
 * @returns A markdown string with the frontmatter block prepended when present
 *
 * @example
 * stringify('# Body\n', { title: 'Hello' })
 * // => '---\ntitle: Hello\n---\n# Body\n'
 *
 * stringify('# Body\n', {})
 * // => '# Body\n'
 */
export function stringify(content: string, data: Readonly<Record<string, unknown>>): string {
  if (Object.keys(data).length === 0) {
    return content
  }
  const yaml = stringifyYaml(data).replace(/\n+$/u, '')
  return `---\n${yaml}\n---\n${content}`
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Strip a leading UTF-8 BOM (U+FEFF) from a string, if present.
 *
 * @private
 * @param raw - Input string
 * @returns Input with leading BOM removed when present, otherwise unchanged
 */
function stripBom(raw: string): string {
  if (raw.startsWith(BOM)) {
    return raw.slice(1)
  }
  return raw
}
