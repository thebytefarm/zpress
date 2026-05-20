import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { log } from '@clack/prompts'
import type { Frontmatter } from '@zpress/config'
import { match } from 'ts-pattern'

import { parse as parseFrontmatter, stringify as stringifyFrontmatter } from './frontmatter.ts'
import { rewriteImages } from './images.ts'
import { rewriteLinks } from './rewrite-links.ts'
import type { ManifestEntry, PageData, SyncContext } from './types.ts'

/**
 * Copy/generate a single page into `.content/`.
 *
 * Reads from `page.source` (file-backed) or evaluates `page.content`
 * (virtual), injects frontmatter, computes a content hash, and writes
 * the output file. Skips the write when the hash matches the previous manifest.
 *
 * @param page - Page data with source path or inline content
 * @param ctx - Sync context (provides output dir, repo root, previous manifest)
 * @returns Manifest entry with content hash for incremental tracking
 */
export async function copyPage(page: PageData, ctx: SyncContext): Promise<ManifestEntry> {
  const outPath = path.resolve(ctx.outDir, page.outputPath)
  await fs.mkdir(path.dirname(outPath), { recursive: true })

  const cached = await tryMtimeSkip(page, ctx)
  if (cached !== null) {
    // Verify the output file still exists on disk — the manifest may survive
    // even if .zpress/content/ was partially deleted.
    const outputExists = await fs.stat(outPath).catch(() => null)
    if (outputExists !== null) {
      return cached
    }
  }

  const content: string = await (async () => {
    if (page.source) {
      const raw = await fs.readFile(page.source, 'utf8')
      const rewritten = rewriteSourceLinks(raw, page, ctx)
      const withImages = await rewriteSourceImages(rewritten, page, ctx)
      return injectFrontmatter(withImages, page.frontmatter)
    }
    if (page.content) {
      const body = match(typeof page.content)
        .with('function', async () => await (page.content as () => Promise<string>)())
        .otherwise(() => page.content as string)
      return injectFrontmatter(await body, page.frontmatter)
    }
    log.error(`[zpress] Page "${page.outputPath}" has neither source nor content`)
    return ''
  })()

  // Only warn for user-authored source files, not generated pages
  if (page.source) {
    warnMdxExports(content, page.outputPath)
  }

  const contentHash = createHash('sha256').update(content).digest('hex')

  // Store source as repo-relative path (not machine-local absolute path)
  const relativeSource = (() => {
    if (page.source !== null && page.source !== undefined) {
      return path.relative(ctx.repoRoot, page.source)
    }
  })()

  // Incremental: skip write if content unchanged
  const prev = (() => {
    if (ctx.previousManifest !== null && ctx.previousManifest !== undefined) {
      return ctx.previousManifest.files[page.outputPath]
    }
  })()

  async function resolveSourceMtime(): Promise<number | undefined> {
    if (page.source !== null && page.source !== undefined) {
      const stat = await fs.stat(page.source)
      return stat.mtimeMs
    }
  }

  const fmHash = hashFrontmatter(page.frontmatter)

  if (prev && prev.contentHash === contentHash) {
    return {
      source: relativeSource,
      sourceMtime: await resolveSourceMtime(),
      contentHash,
      outputPath: page.outputPath,
      frontmatterHash: fmHash,
    }
  }

  await fs.writeFile(outPath, content, 'utf8')

  return {
    source: relativeSource,
    sourceMtime: await resolveSourceMtime(),
    contentHash,
    outputPath: page.outputPath,
    frontmatterHash: fmHash,
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Compute an MD5 hash of serialized frontmatter for change detection.
 *
 * @private
 * @param fm - Frontmatter key-value pairs
 * @returns Hex MD5 digest of the JSON-serialized frontmatter
 */
function hashFrontmatter(fm: Frontmatter): string {
  return createHash('md5').update(JSON.stringify(fm)).digest('hex')
}

/**
 * Attempt to skip the full copy pipeline by comparing source mtime and frontmatter hash.
 *
 * Returns the previous manifest entry when all conditions hold:
 * - `ctx.skipMtimeOptimization` is not true
 * - Page has a source file (not virtual)
 * - Previous manifest has a matching entry with the same `sourceMtime`
 * - Page frontmatter hash matches stored `frontmatterHash`
 *
 * @private
 * @param page - Page data to check
 * @param ctx - Sync context with previous manifest
 * @returns Previous manifest entry if skippable, null otherwise
 */
async function tryMtimeSkip(page: PageData, ctx: SyncContext): Promise<ManifestEntry | null> {
  if (ctx.skipMtimeOptimization === true) {
    return null
  }
  if (page.source === null || page.source === undefined) {
    return null
  }
  if (ctx.previousManifest === null || ctx.previousManifest === undefined) {
    return null
  }
  const prev = ctx.previousManifest.files[page.outputPath]
  if (prev === null || prev === undefined) {
    return null
  }
  if (prev.sourceMtime === null || prev.sourceMtime === undefined) {
    return null
  }
  const stat = await fs.stat(page.source).catch(() => null)
  if (stat === null) {
    return null
  }
  if (stat.mtimeMs !== prev.sourceMtime) {
    return null
  }
  const fmHash = hashFrontmatter(page.frontmatter)
  if (prev.frontmatterHash === null || prev.frontmatterHash === undefined) {
    return null
  }
  if (fmHash !== prev.frontmatterHash) {
    return null
  }
  return prev
}

/**
 * Rewrite relative markdown links in source content when a source map is available.
 * No-op when the context has no source map (e.g. during resolve-only passes).
 *
 * @private
 * @param raw - Raw markdown content
 * @param page - Page data with source path information
 * @param ctx - Sync context with optional source map
 * @returns Content with rewritten links, or original content if no source map
 */
function rewriteSourceLinks(raw: string, page: PageData, ctx: SyncContext): string {
  if (ctx.sourceMap === null || ctx.sourceMap === undefined) {
    return raw
  }
  if (page.source === null || page.source === undefined) {
    return raw
  }
  const sourcePath = path.relative(ctx.repoRoot, page.source)
  return rewriteLinks({
    content: raw,
    sourcePath,
    outputPath: page.outputPath,
    sourceMap: ctx.sourceMap,
  })
}

/**
 * Rewrite relative image references in source content, copying image files
 * to the content public directory. No-op for virtual pages (no source file).
 *
 * @private
 * @param content - Markdown content (after link rewriting)
 * @param page - Page data with source path information
 * @param ctx - Sync context with repo root and output directory
 * @returns Content with rewritten image paths
 */
function rewriteSourceImages(content: string, page: PageData, ctx: SyncContext): Promise<string> {
  if (page.source === null || page.source === undefined) {
    return Promise.resolve(content)
  }
  const sourcePath = path.relative(ctx.repoRoot, page.source)
  return rewriteImages({
    content,
    sourcePath,
    repoRoot: ctx.repoRoot,
    outDir: ctx.outDir,
  })
}

/**
 * Regex matching ESM export declarations that `remarkSplitMdx` strips during SSG-MD.
 *
 * @private
 */
const MDX_EXPORT_PATTERN = /^export\s+(const|let|var|function|default)\s/

/**
 * Warn when an `.mdx` file contains top-level ESM exports outside fenced code blocks.
 *
 * Rspress's `remarkSplitMdx` strips all `mdxjsEsm` nodes during the SSG-MD pass,
 * so any `export const` referenced by JSX will cause a `ReferenceError` at build time.
 * This check catches those issues early during sync.
 *
 * @private
 * @param content - Full page content string
 * @param outputPath - Output path used for the warning message
 */
function warnMdxExports(content: string, outputPath: string): void {
  if (!outputPath.endsWith('.mdx')) {
    return
  }

  const lines = content.split('\n')
  const exportLines = lines.reduce<readonly number[]>((acc, line, index) => {
    if (MDX_EXPORT_PATTERN.test(line)) {
      return [...acc, index + 1]
    }
    return acc
  }, [])

  if (exportLines.length === 0) {
    return
  }

  // Filter out exports inside fenced code blocks
  const fenceRanges = lines.reduce<readonly (readonly [number, number])[]>((acc, line, index) => {
    const isFence = line.trimStart().startsWith('```')
    const lastRange = acc.at(-1)
    if (isFence && lastRange && lastRange[1] === -1) {
      return [...acc.slice(0, -1), [lastRange[0], index + 1] as const]
    }
    if (isFence) {
      return [...acc, [index + 1, -1] as const]
    }
    return acc
  }, [])

  const outsideFence = exportLines.filter(
    (lineNum) =>
      !fenceRanges.some(([start, end]) => lineNum >= start && (end === -1 || lineNum <= end))
  )

  if (outsideFence.length > 0) {
    log.warn(
      `[zpress] ${outputPath}: found ESM export(s) on line(s) ${outsideFence.join(', ')}. ` +
        'ESM exports are stripped during SSG-MD rendering and will cause ReferenceErrors ' +
        'if referenced by JSX. Use inline values instead.'
    )
  }
}

/**
 * Merge frontmatter into markdown.
 * Config-level frontmatter acts as defaults; source file frontmatter wins.
 *
 * @private
 * @param raw - Raw markdown content (may include existing frontmatter)
 * @param fm - Frontmatter key-value pairs to inject as defaults
 * @returns Markdown string with merged frontmatter
 */
function injectFrontmatter(raw: string, fm: Frontmatter): string {
  if (Object.keys(fm).length === 0) {
    return raw
  }

  const parsed = parseFrontmatter(raw)
  const merged = { ...fm, ...parsed.data }
  return stringifyFrontmatter(parsed.content, merged)
}
