import path from 'node:path'

import { match } from 'ts-pattern'

import type { PageData } from './types.ts'

/**
 * Placeholder prefix used to protect code blocks from link rewriting.
 */
const PLACEHOLDER_PREFIX = '<!--ZPRESS_CODE_BLOCK_'

/**
 * Placeholder suffix for code block markers.
 */
const PLACEHOLDER_SUFFIX = '-->'

/**
 * Regex matching fenced code blocks.
 */
const CODE_BLOCK_RE = /```[\s\S]*?```/g

/**
 * Regex matching markdown links: `[text](url)` or `[text](url "title")`.
 * Uses a negative lookbehind to exclude image links (prefixed with `!`).
 */
// oxlint-disable-next-line security/detect-unsafe-regex -- pattern is bounded by non-overlapping character classes; no ReDoS risk
const LINK_RE = /(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/**
 * Regex to restore code block placeholders.
 */
const PLACEHOLDER_RE = /<!--ZPRESS_CODE_BLOCK_(\d+)-->/g

/**
 * Mapping from repo-relative source path to content-relative output path.
 */
export type SourceMap = ReadonlyMap<string, string>

/**
 * Build a mapping from repo-relative source paths to content-relative output paths.
 *
 * Used by the link rewriter to resolve relative links in source markdown files
 * to their correct output locations.
 *
 * @param params - Pages and repo root for computing relative paths
 * @returns Immutable map of source path to output path
 */
export function buildSourceMap(params: {
  readonly pages: readonly PageData[]
  readonly repoRoot: string
}): SourceMap {
  return new Map(
    params.pages.flatMap((page): readonly [string, string][] => {
      if (page.source === null || page.source === undefined) {
        return []
      }
      const relSource = path.relative(params.repoRoot, page.source)
      return [[relSource, page.outputPath]]
    })
  )
}

/**
 * Rewrite relative markdown links in content to match the output directory structure.
 *
 * Scans markdown for relative links to `.md`/`.mdx` files, resolves them against
 * the source file's location, looks up the target in the source map, and rewrites
 * the link to point to the correct output location.
 *
 * Links that cannot be mapped (external, absolute, anchor-only, or not in the
 * source map) are left unchanged.
 *
 * @param params - Content, source/output paths, and the source-to-output map
 * @returns Content with rewritten links
 */
export function rewriteLinks(params: {
  readonly content: string
  readonly sourcePath: string
  readonly outputPath: string
  readonly sourceMap: SourceMap
}): string {
  // 1. Extract fenced code blocks to avoid rewriting links inside them
  const codeBlocks: string[] = []
  const withoutCode = params.content.replace(CODE_BLOCK_RE, (block) => {
    const idx = codeBlocks.length
    codeBlocks.push(block)
    return `${PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`
  })

  // 2. Rewrite relative markdown links
  const sourceDir = path.dirname(params.sourcePath)
  const outputDir = path.dirname(params.outputPath)

  const rewritten = withoutCode.replace(LINK_RE, (fullMatch, url: string) => {
    const resolved = resolveLink({ url, sourceDir, outputDir, sourceMap: params.sourceMap })
    if (resolved === null) {
      return fullMatch
    }
    return fullMatch.replace(url, resolved)
  })

  // 3. Restore code blocks
  return rewritten.replace(PLACEHOLDER_RE, (_, idx) => codeBlocks[Number(idx)])
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Attempt to resolve a single link URL to its correct output-relative path.
 *
 * @private
 * @param params - Link resolution parameters
 * @param params.url - The URL to resolve
 * @param params.sourceDir - Directory of the source file
 * @param params.outputDir - Directory of the output file
 * @param params.sourceMap - Source-to-output path mapping
 * @returns The rewritten URL string, or null if the link should be left unchanged
 */
function resolveLink(params: {
  readonly url: string
  readonly sourceDir: string
  readonly outputDir: string
  readonly sourceMap: SourceMap
}): string | null {
  // Skip absolute URLs, protocol URLs, and anchor-only links
  if (isNonRewritableUrl(params.url)) {
    return null
  }

  // Split URL into path and fragment
  const { linkPath, fragment } = splitFragment(params.url)

  // Only rewrite links to markdown files
  if (!linkPath.endsWith('.md') && !linkPath.endsWith('.mdx')) {
    return null
  }

  // Resolve relative to source directory to get repo-relative path
  const resolvedSource = path.normalize(path.join(params.sourceDir, linkPath))

  // Look up the target in the source map
  const targetOutput = params.sourceMap.get(resolvedSource)
  if (targetOutput === undefined) {
    return null
  }

  // Compute relative path from output directory to target output
  const relativePath = path.relative(params.outputDir, targetOutput)

  // Normalize to forward slashes (for cross-platform safety)
  const normalized = relativePath.split(path.sep).join('/')

  return `${normalized}${fragment}`
}

/**
 * Check whether a URL should be skipped by the link rewriter.
 *
 * @private
 * @param url - URL string to check
 * @returns True if the URL is absolute, protocol-based, or anchor-only
 */
function isNonRewritableUrl(url: string): boolean {
  return (
    url.startsWith('/') ||
    url.startsWith('#') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('mailto:')
  )
}

/**
 * Split a URL into its path and fragment components.
 *
 * @private
 * @param url - URL string to split
 * @returns Object with linkPath and fragment (empty string if no fragment)
 */
function splitFragment(url: string): { readonly linkPath: string; readonly fragment: string } {
  const hashIdx = url.indexOf('#')
  return match(hashIdx !== -1)
    .with(true, () => ({
      linkPath: url.slice(0, hashIdx),
      fragment: url.slice(hashIdx),
    }))
    .otherwise(() => ({
      linkPath: url,
      fragment: '',
    }))
}
