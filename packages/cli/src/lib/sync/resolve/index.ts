import fs from 'node:fs'
import path from 'node:path'

import { log } from '@clack/prompts'
import { hasAnyGlobInclude, isSingleFileInclude, normalizeInclude } from '@zpress/config'
import type { Section, Frontmatter } from '@zpress/config'
import fg from 'fast-glob'
import { match, P } from 'massaman/match'

import { syncError, collectResults } from '../errors.ts'
import type { SyncError, SyncOutcome } from '../errors.ts'
import type { ResolvedEntry, SyncContext } from '../types.ts'
import { extractBaseDir, linkToOutputPath, sourceExt } from './path.ts'
import { resolveRecursiveGlob } from './recursive.ts'
import { sortEntries } from './sort.ts'
import { deriveText, resolveSectionTitle } from './text.ts'

/**
 * Walk the Section tree and produce a ResolvedEntry tree.
 *
 * Resolves globs, derives text, merges frontmatter, deduplicates.
 * Returns a `SyncOutcome` tuple — the caller is responsible for
 * surfacing errors and exiting.
 *
 * @param sections - Config section tree to resolve
 * @param ctx - Sync context (provides repo root, config, quiet flag)
 * @param inheritedFrontmatter - Frontmatter inherited from parent sections
 * @param depth - Current nesting depth (0 = top-level)
 * @returns Result tuple containing resolved entry tree or the first sync error
 */
export async function resolveEntries(
  sections: readonly Section[],
  ctx: SyncContext,
  inheritedFrontmatter: Frontmatter = {},
  depth = 0
): Promise<readonly [SyncError, null] | readonly [null, ResolvedEntry[]]> {
  const results = await Promise.all(
    sections.map((section) => resolveSection(section, ctx, inheritedFrontmatter, depth))
  )

  const result = collectResults(results)
  const [err] = result
  if (err) {
    return [err, null]
  }

  const [, collected] = result as readonly [null, readonly ResolvedEntry[]]
  return [null, [...collected]]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve a single section node — dispatches to leaf, virtual, or nested section handler.
 *
 * @private
 * @param section - Section config node to resolve
 * @param ctx - Sync context
 * @param inheritedFrontmatter - Frontmatter inherited from parent
 * @param depth - Current nesting depth
 * @returns Sync outcome tuple with resolved entry or error
 */
function resolveSection(
  section: Section,
  ctx: SyncContext,
  inheritedFrontmatter: Frontmatter,
  depth: number
): Promise<SyncOutcome<ResolvedEntry>> {
  const mergedFm = { ...inheritedFrontmatter, ...section.frontmatter }

  // Leaf page from single file
  if (isSingleFileInclude(section.include) && !section.items) {
    return Promise.resolve(resolveFilePage(section, ctx, mergedFm))
  }

  // Virtual page (inline/generated content)
  if (section.content !== undefined && section.content !== null && section.path) {
    return Promise.resolve(resolveVirtualPage(section, mergedFm))
  }

  // Nested section — may have glob, explicit items, or both
  return resolveNestedSection(section, ctx, mergedFm, depth)
}

/**
 * Resolve a leaf page backed by a single source file.
 *
 * @private
 * @param section - Section config with `include` pointing to a file
 * @param ctx - Sync context
 * @param frontmatter - Merged frontmatter for the page
 * @returns Sync outcome with resolved entry or error
 */
function resolveFilePage(
  section: Section,
  ctx: SyncContext,
  frontmatter: Frontmatter
): SyncOutcome<ResolvedEntry> {
  const { include } = section
  if (include === null || include === undefined || typeof include !== 'string') {
    return [
      syncError('missing_from', 'resolveFilePage called without single-file section.include'),
      null,
    ]
  }

  const sourcePath = path.resolve(ctx.repoRoot, include)
  if (!fs.existsSync(sourcePath)) {
    return [syncError('file_not_found', `Source file not found: ${include}`), null]
  }

  if (section.path === null || section.path === undefined) {
    return [
      syncError('missing_link', `resolveFilePage called without section.path for: ${include}`),
      null,
    ]
  }

  const ext = sourceExt(include)

  return [
    null,
    {
      title: resolveSectionTitle(section),
      description: section.description,
      link: section.path,
      hidden: section.hidden,
      card: section.card,
      page: {
        source: sourcePath,
        outputPath: linkToOutputPath(section.path, ext),
        frontmatter,
      },
    },
  ]
}

/**
 * Resolve a virtual page with inline or generated content.
 *
 * @private
 * @param section - Section config with `content` field
 * @param frontmatter - Merged frontmatter for the page
 * @returns Sync outcome with resolved entry or error
 */
function resolveVirtualPage(
  section: Section,
  frontmatter: Frontmatter
): SyncOutcome<ResolvedEntry> {
  if (section.path === undefined || section.path === null) {
    return [syncError('missing_link', 'resolveVirtualPage called without section.path'), null]
  }

  return [
    null,
    {
      title: resolveSectionTitle(section),
      description: section.description,
      link: section.path,
      hidden: section.hidden,
      card: section.card,
      page: {
        content: section.content,
        outputPath: linkToOutputPath(section.path),
        frontmatter,
      },
    },
  ]
}

/**
 * Resolve a nested section — may include glob-discovered children,
 * explicit children, or both. Deduplicates and sorts the result.
 *
 * @private
 * @param section - Section config node with potential children
 * @param ctx - Sync context
 * @param mergedFm - Merged frontmatter
 * @param depth - Current nesting depth
 * @returns Sync outcome with resolved entry containing children
 */
async function resolveNestedSection(
  section: Section,
  ctx: SyncContext,
  mergedFm: Frontmatter,
  depth: number
): Promise<SyncOutcome<ResolvedEntry>> {
  // 1. Auto-discover from glob
  const globbed = await (() => {
    if (hasAnyGlobInclude(section.include)) {
      if (section.recursive) {
        return resolveRecursiveGlob(section, ctx, mergedFm, depth + 1)
      }
      return resolveGlob(section, ctx, mergedFm)
    }
    return Promise.resolve([] as ResolvedEntry[])
  })()

  // 2. Explicit children
  const explicitResult = await (() => {
    if (section.items) {
      return resolveEntries(section.items, ctx, mergedFm, depth + 1)
    }
    return Promise.resolve([null, [] as ResolvedEntry[]] as const)
  })()

  const [explicitErr, explicit] = explicitResult
  if (explicitErr) {
    return [explicitErr, null]
  }

  // 3. Merge, deduplicate (explicit wins over glob), sort
  const children = [...globbed, ...explicit]
  const deduped = deduplicateByLink(children)
  const sorted = sortEntries(deduped, section.sort)

  // Section header can also be a page (has path + single-file include)
  const sectionPage = resolveSectionPage(section, ctx, mergedFm)

  // Collapsible: explicit value wins, otherwise auto-collapse below top level
  const autoCollapsible = (() => {
    if (depth > 0) {
      return true as const
    }
  })()
  const collapsible = section.collapsible ?? autoCollapsible

  // Auto-derive link so the group is navigable and gets a landing page.
  // Priority: explicit path > common prefix of children's links
  const derivedLink = deriveCommonPrefix(sorted)
  const link = section.path ?? derivedLink
  const autoLink = !section.path && link !== undefined

  return [
    null,
    {
      title: resolveSectionTitle(section),
      description: section.description,
      link,
      collapsible,
      hidden: section.hidden,
      card: section.card,
      landing: section.landing,
      standalone: section.standalone,
      root: section.root,
      autoLink,
      items: sorted,
      page: sectionPage,
    },
  ]
}

/**
 * Resolve the section header page (if the section has a `path` and a single-file `include`).
 *
 * @private
 * @param section - Section config
 * @param ctx - Sync context
 * @param mergedFm - Merged frontmatter
 * @returns Page data for the section header, or undefined
 */
function resolveSectionPage(
  section: Section,
  ctx: SyncContext,
  mergedFm: Frontmatter
): ResolvedEntry['page'] | undefined {
  if (section.path && isSingleFileInclude(section.include)) {
    const include = section.include as string
    const sourcePath = path.resolve(ctx.repoRoot, include)
    if (fs.existsSync(sourcePath)) {
      const ext = sourceExt(include)
      return {
        source: sourcePath,
        outputPath: linkToOutputPath(section.path, ext),
        frontmatter: mergedFm,
      }
    }
  } else if (section.path && section.recursive && section.include) {
    // Recursive mode: find the root-level entry file from the glob base (.md or .mdx)
    const patterns = normalizeInclude(section.include)
    const baseDir = extractBaseDir(patterns[0])
    const entryFile = section.entryFile ?? 'overview'
    const mdPath = path.join(baseDir, `${entryFile}.md`)
    const mdxPath = path.join(baseDir, `${entryFile}.mdx`)
    const mdxExists = fs.existsSync(path.resolve(ctx.repoRoot, mdxPath))
    const indexPath = match(mdxExists)
      .with(true, () => mdxPath)
      .otherwise(() => mdPath)
    const sourcePath = path.resolve(ctx.repoRoot, indexPath)
    if (fs.existsSync(sourcePath)) {
      const ext = sourceExt(indexPath)
      return {
        source: sourcePath,
        outputPath: linkToOutputPath(section.path, ext),
        frontmatter: mergedFm,
      }
    }
  }
}

/**
 * Resolve a non-recursive glob pattern into leaf page entries.
 *
 * @private
 * @param section - Section config with glob `include` pattern(s)
 * @param ctx - Sync context
 * @param frontmatter - Frontmatter to apply to discovered pages
 * @returns Array of resolved entries for each matching file
 */
async function resolveGlob(
  section: Section,
  ctx: SyncContext,
  frontmatter: Frontmatter
): Promise<ResolvedEntry[]> {
  const ignore = [...(ctx.config.exclude ?? []), ...(section.exclude ?? [])]

  if (section.include === null || section.include === undefined) {
    log.error('[zpress] resolveGlob called without section.include')
    return []
  }

  const patterns = normalizeInclude(section.include)
  const files = await fg(patterns as string[], {
    cwd: ctx.repoRoot,
    ignore,
    absolute: false,
    onlyFiles: true,
  })

  const titleStr = resolveSectionTitle(section)

  if (files.length === 0) {
    if (!ctx.quiet) {
      log.warn(`Glob "${String(section.include)}" matched 0 files for "${titleStr}"`)
    }
    return []
  }

  const prefix = section.path ?? ''

  // Extract titleFrom and titleTransform from title object config
  const titleConfig = match(section.title)
    .when(
      (
        t
      ): t is {
        from: 'auto' | 'filename' | 'heading' | 'frontmatter'
        transform?: (text: string, slug: string) => string
      } => typeof t === 'object' && t !== null && 'from' in t,
      (t) => t
    )
    .otherwise(() => null)
  const titleFrom = match(titleConfig)
    .with(P.nonNullable, (tc) => tc.from)
    .otherwise(() => 'auto' as const)
  const titleTransform = match(titleConfig)
    .with(P.nonNullable, (tc) => tc.transform ?? null)
    .otherwise(() => null)

  return Promise.all(
    files.map(async (file) => {
      const ext = sourceExt(file)
      const slug = path.basename(file, path.extname(file))
      const link = `${prefix}/${slug}`
      const sourcePath = path.resolve(ctx.repoRoot, file)
      const rawTitle = await deriveText(sourcePath, slug, titleFrom)
      const title = match(titleTransform)
        .with(P.nonNullable, (t) => t(rawTitle, slug))
        .otherwise(() => rawTitle)

      return {
        title,
        link,
        page: {
          source: sourcePath,
          outputPath: linkToOutputPath(link, ext),
          frontmatter,
        },
      } satisfies ResolvedEntry
    })
  )
}

/**
 * Derive a common path prefix from children's links.
 *
 * Given children with links like `/a/b/c`, `/a/b/d`, `/a/b/e`,
 * returns `/a/b`. Returns `undefined` when no common prefix exists
 * or there are no children with links.
 *
 * @private
 * @param children - Child entries to derive common prefix from
 * @returns Common link prefix, or undefined
 */
function deriveCommonPrefix(children: readonly ResolvedEntry[]): string | undefined {
  const links = children.filter((c) => c.link).map((c) => c.link as string)
  if (links.length === 0) {
    return undefined
  }

  const segmentArrays = links.map((link) => link.split('/').filter(Boolean))
  const shortest = segmentArrays.reduce(
    (min, segs) => Math.min(min, segs.length),
    Number.POSITIVE_INFINITY
  )

  const refSegs = segmentArrays[0].slice(0, shortest)
  const divergeAt = refSegs.findIndex((seg, i) => !segmentArrays.every((segs) => segs[i] === seg))
  const common = match(divergeAt)
    .with(-1, () => refSegs)
    .otherwise((n) => refSegs.slice(0, n))

  if (common.length === 0) {
    return undefined
  }

  return `/${common.join('/')}`
}

/**
 * Deduplicate entries by `link`. Later entries (explicit) override earlier (glob).
 *
 * Uses `link` as the dedup key when present. Entries without a link are never
 * considered duplicates — they always pass through (sections with only `text`).
 *
 * @private
 * @param entries - Entries to deduplicate
 * @returns Deduplicated entries with later entries winning over earlier ones
 */
function deduplicateByLink(entries: readonly ResolvedEntry[]): ResolvedEntry[] {
  const { result } = entries.reduce<{ seen: Map<string, number>; result: ResolvedEntry[] }>(
    (acc, entry) => {
      // Only dedup by link — entries without links are always unique
      if (entry.link === null || entry.link === undefined) {
        return {
          seen: acc.seen,
          result: [...acc.result, entry],
        }
      }
      const existing = acc.seen.get(entry.link)
      if (existing === undefined) {
        // intentional mutation: seen Map is mutated in-place for O(1) dedup lookups
        acc.seen.set(entry.link, acc.result.length)
        return {
          seen: acc.seen,
          result: [...acc.result, entry],
        }
      }
      // Later entry wins (explicit items come after glob)
      return {
        seen: acc.seen,
        result: acc.result.map((item, i) => {
          if (i === existing) {
            return entry
          }
          return item
        }),
      }
    },
    { seen: new Map<string, number>(), result: [] }
  )

  return result
}
