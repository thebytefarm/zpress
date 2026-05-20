import {
  collectAllWorkspaceItems,
  configWarning,
  normalizeInclude,
  resolveOptionalIcon,
  serializeIcon,
} from '@zpress/config'
import type { ConfigWarning, Section, TitleConfig, Workspace, ZpressConfig } from '@zpress/config'
import { isNil, isString, isUndefined, kebabCase, omitBy } from 'es-toolkit'
import { match, P } from 'ts-pattern'

import { buildWorkspaceCardJsx } from './sidebar/landing.ts'
import type { ResolvedEntry } from './types.ts'

/**
 * Apps and packages arrays extracted from config.
 */
interface WorkspaceArrays {
  readonly apps: readonly Workspace[]
  readonly packages: readonly Workspace[]
}

/**
 * Default descriptions for well-known workspace category titles.
 */
const DEFAULT_CATEGORY_DESCRIPTIONS: Readonly<Record<string, string>> = {
  packages:
    'Reusable modules shared across the codebase — libraries, utilities, configs, SDKs, and internal tooling.',
  apps: 'Standalone applications and runnable services — APIs, workers, web apps, and anything that deploys independently.',
}

/**
 * Enrich resolved entries with card metadata derived from workspace items.
 *
 * Walks the resolved entry tree and, for each entry whose link starts with
 * a `Workspace.path`, produces a new tree with `CardConfig` metadata
 * added — without mutating the original entries.
 *
 * @param entries - Resolved entry tree from `resolveEntries()`
 * @param config - zpress config containing `workspaces` categories
 * @returns New entry tree with card metadata enriched
 */
export function enrichWorkspaceCards(
  entries: readonly ResolvedEntry[],
  config: ZpressConfig
): ResolvedEntry[] {
  const items = collectAllWorkspaceItems(config)
  if (items.length === 0) {
    return [...entries]
  }

  return enrichEntries(entries, items)
}

/**
 * Generate the home page markdown from workspace items.
 *
 * Produces Rspress frontmatter (hero, features) plus workspace grid blocks.
 * Tags render as SVG icons (when available) or text labels.
 *
 * @param workspaces - Workspace categories from config
 * @returns Full home page markdown string
 */
export function generateHomePage(workspaces: WorkspaceArrays): string {
  const frontmatter = [
    '---',
    'layout: home',
    'hero:',
    '  text: Documentation',
    '  tagline: "Internal platform documentation"',
    '  image:',
    '    src: /banner.svg',
    '    alt: zpress',
    '  actions:',
    '    - theme: brand',
    '      text: Get Started',
    '      link: /introduction',
    '    - theme: alt',
    '      text: Architecture',
    '      link: /architecture',
    'features:',
    '  - title: Guides',
    '    icon:',
    '      src: /icons/guides.svg',
    '      height: 48px',
    '      width: 48px',
    '    details: Step-by-step walkthroughs covering setup, workflows, and common tasks.',
    '    link: /guides/setup-local-env',
    '  - title: Standards',
    '    icon:',
    '      src: /icons/standards.svg',
    '      height: 48px',
    '      width: 48px',
    '    details: Code style, naming conventions, and engineering best practices for the team.',
    '    link: /standards/git-commits',
    '  - title: Security',
    '    icon:',
    '      src: /icons/security.svg',
    '      height: 48px',
    '      width: 48px',
    '    details: Authentication, authorization, secrets management, and vulnerability policies.',
    '    link: /security/http',
    '---',
  ].join('\n')

  const appsSection = buildWorkspaceSection(
    'Apps',
    'Standalone applications and runnable services — APIs, workers, web apps, and anything that deploys independently.',
    workspaces.apps,
    'apps/'
  )

  const packagesSection = buildWorkspaceSection(
    'Packages',
    'Reusable modules shared across the codebase — libraries, utilities, configs, SDKs, and internal tooling.',
    workspaces.packages,
    'packages/'
  )

  return [
    frontmatter,
    '',
    '<div class="zp-workspace-section">',
    '',
    appsSection,
    '',
    packagesSection,
    '',
    '</div>',
  ].join('\n')
}

/**
 * Generate the introduction page markdown from workspace items.
 *
 * Produces a "What's inside" section with dynamic bullet lists derived
 * from workspace items.
 *
 * @param workspaces - Workspace items from config
 * @returns Full introduction page markdown string
 */
export function generateIntroPage(workspaces: WorkspaceArrays): string {
  const appsList = workspaces.apps.map((a) => `${a.title} (${a.description})`).join(', ')
  const packagesList = workspaces.packages.map((a) => `${a.title} (${a.description})`).join(', ')

  return [
    '# Introduction',
    '',
    'Internal platform documentation.',
    '',
    'The codebase is a **pnpm workspace** managed by **Turborepo**, written in **TypeScript** with strict mode enabled.',
    '',
    "## What's inside",
    '',
    `- **Apps** \u2014 Standalone applications and runnable services: ${appsList}`,
    `- **Packages** \u2014 Reusable modules and shared code: ${packagesList}`,
    '- **Tooling** \u2014 Internal developer tools including this documentation site',
  ].join('\n')
}

/**
 * Synthesize Section entries from workspace config (categories).
 *
 * Produces standalone parent sections with workspace item children,
 * ready to merge into `config.sections` before resolution.
 * Skips any category whose link already exists in `config.sections`.
 *
 * @param config - zpress config containing workspaces
 * @returns Section array of synthesized workspace sections
 */
export function synthesizeWorkspaceSections(config: ZpressConfig): Section[] {
  const existingLinks = collectAllLinks(config.sections)

  const apps = config.apps ?? []
  const packages = config.packages ?? []
  const categories = config.workspaces ?? []

  const appsSection = match(apps.length > 0 && !existingLinks.has('/apps'))
    .with(true, (): Section | null => {
      const filteredItems = apps
        .filter((item) => !existingLinks.has(item.path))
        .map(workspaceToSection)
      if (filteredItems.length === 0) {
        return null
      }
      return {
        title: 'Apps',
        path: '/apps',
        standalone: true,
        frontmatter: {
          description:
            'Standalone applications and runnable services — APIs, workers, web apps, and anything that deploys independently.',
        },
        items: filteredItems,
      }
    })
    .otherwise(() => null)

  const packagesSection = match(packages.length > 0 && !existingLinks.has('/packages'))
    .with(true, (): Section | null => {
      const filteredItems = packages
        .filter((item) => !existingLinks.has(item.path))
        .map(workspaceToSection)
      if (filteredItems.length === 0) {
        return null
      }
      return {
        title: 'Packages',
        path: '/packages',
        standalone: true,
        frontmatter: {
          description:
            'Reusable modules shared across the codebase — libraries, utilities, configs, SDKs, and internal tooling.',
        },
        items: filteredItems,
      }
    })
    .otherwise(() => null)

  const categoryEntries = categories.map((category): Section | null => {
    const link = category.link ?? `/${slugify(String(category.title))}`
    if (existingLinks.has(link)) {
      return null
    }
    const filteredItems = category.items
      .filter((item) => !existingLinks.has(item.path))
      .map(workspaceToSection)
    if (filteredItems.length === 0) {
      return null
    }
    const description = category.description ?? resolveDefaultCategoryDescription(category.title)
    return {
      title: category.title,
      path: link,
      standalone: true,
      frontmatter: {
        description,
      },
      items: filteredItems,
    }
  })

  return [appsSection, packagesSection, ...categoryEntries].filter(
    (section): section is Section => section !== null
  )
}

/**
 * Check workspace items for include patterns that will be double-prefixed.
 *
 * When a workspace `include` pattern already starts with the basePath
 * derived from `path`, the resolved glob becomes double-prefixed
 * and will silently match zero files. This produces warnings so the
 * user can fix their config before broken links appear in the build.
 *
 * @param config - Validated zpress config
 * @returns Array of warnings for any workspace items with suspect includes
 */
export function checkWorkspaceIncludes(config: ZpressConfig): readonly ConfigWarning[] {
  const allItems = collectAllWorkspaceItems(config)
  return allItems.flatMap((item) => checkItemInclude(item))
}

/**
 * Convert display text to a URL-safe slug.
 * E.g. "Getting Started" → "getting-started", "updatePet" → "update-pet"
 *
 * @param text - Display text to slugify
 * @returns URL-safe lowercase slug
 */
export function slugify(text: string): string {
  return kebabCase(text)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check a single workspace item for include patterns that already start
 * with the basePath derived from `path`.
 *
 * @private
 * @param item - Workspace item to check
 * @returns Array of warnings (empty if no issues)
 */
function checkItemInclude(item: Workspace): readonly ConfigWarning[] {
  if (item.include === null || item.include === undefined) {
    return []
  }
  const basePath = item.path.replace(/^\//, '')
  const patterns = normalizeInclude(item.include)
  return patterns
    .filter((pattern) => pattern.startsWith(basePath))
    .map((pattern) =>
      configWarning(
        'duplicate_include_prefix',
        `Workspace "${String(item.title)}" include "${pattern}" already starts with "${basePath}" — ` +
          `it will resolve to "${basePath}/${pattern}" which likely matches zero files. ` +
          `Did you mean "${pattern.slice(basePath.length + 1)}"? (include is relative to path)`
      )
    )
}

/**
 * Recursively collect all links from a section tree.
 * Walks sections and their nested items to find every defined link.
 *
 * @private
 * @param sections - Section tree to walk
 * @returns Set of all link strings found in the tree
 */
function collectAllLinks(sections: readonly Section[]): Set<string> {
  return new Set(
    sections.flatMap((section): string[] => {
      const self = collectSelfLinks(section.path)
      const nested = collectNestedLinks(section.items)
      return [...self, ...nested]
    })
  )
}

/**
 * Recursively produce a new entry tree with card metadata from workspace items.
 *
 * @private
 * @param entries - Resolved entry tree to enrich
 * @param items - Workspace items containing card metadata
 * @returns New entry tree with card metadata added where matched
 */
function enrichEntries(
  entries: readonly ResolvedEntry[],
  items: readonly Workspace[]
): ResolvedEntry[] {
  return entries.map((entry) => {
    const enrichedItems = resolveEnrichedItems(entry.items, items)

    if (entry.link && !entry.card) {
      const entryLink = entry.link
      const matched = items.find((item) => entryLink === item.path)
      if (matched) {
        const scope = deriveScope(matched.path)
        const tags = resolveTags(matched.tags)
        const badge = resolveBadge(matched.badge)

        return {
          ...entry,
          items: enrichedItems,
          card: {
            icon: matched.icon,
            scope,
            description: matched.description,
            tags,
            badge,
          },
        }
      }
    }

    if (enrichedItems) {
      return { ...entry, items: enrichedItems }
    }
    return entry
  })
}

/**
 * Derive the scope label from a path.
 * E.g. "/apps/api" → "apps/", "/packages/database" → "packages/"
 *
 * @private
 * @param itemPath - Workspace item path
 * @returns Scope label string (first segment with trailing slash)
 */
function deriveScope(itemPath: string): string {
  const segments = itemPath.split('/').filter(Boolean)
  if (segments.length > 0) {
    return `${segments[0]}/`
  }
  return ''
}

/**
 * Build a workspace section (heading + description + card grid) for the home page.
 *
 * @private
 * @param heading - Section heading text
 * @param description - Section description text
 * @param items - Workspace items to render as cards
 * @param scopePrefix - Prefix for scoping items
 * @returns Markdown string with heading, description, and card grid
 */
function buildWorkspaceSection(
  heading: string,
  description: string,
  items: readonly Workspace[],
  scopePrefix: string
): string {
  const cards = items.map((item) => {
    const resolved = resolveOptionalIcon(item.icon)
    const titleStr = match(item.title)
      .with(P.string, (t) => t)
      .otherwise(String)
    return buildWorkspaceCardJsx({
      link: item.path,
      title: titleStr,
      icon: serializeIcon(resolved),
      scope: scopePrefix,
      description: item.description,
      tags: item.tags,
      badge: item.badge,
    })
  })

  return [
    `## ${heading}`,
    '',
    description,
    '',
    '<WorkspaceGrid>',
    cards.join('\n'),
    '</WorkspaceGrid>',
  ].join('\n')
}

/**
 * Convert a Workspace to a Section, extracting discovery fields and applying defaults.
 *
 * Uses `path` as both the section URL and URL prefix for glob-discovered children.
 * The `include` field is resolved relative to the workspace item's base path
 * (derived from `path`). When `recursive` is true the default include is a deep
 * glob matching all nested markdown, otherwise a shallow single-level glob.
 *
 * @private
 * @param item - Workspace item to convert
 * @returns Section config derived from the workspace item
 */
function workspaceToSection(item: Workspace): Section {
  const base: Section = {
    title: item.title,
    icon: item.icon,
    path: item.path,
  }

  return applyOptionalFields(base, item)
}

/**
 * Apply optional discovery fields to a base section from a workspace item.
 *
 * @private
 * @param base - Base section with title, icon, and path
 * @param item - Workspace item with optional discovery fields
 * @returns Complete section with all discovery fields resolved
 */
function applyOptionalFields(base: Section, item: Workspace): Section {
  const defaultPattern = match(item.recursive)
    .with(true, () => 'docs/**/*.md')
    .otherwise(() => 'docs/*.md')
  const fromPattern = item.include ?? defaultPattern
  const basePath = item.path.replace(/^\//, '')
  const resolvedInclude = normalizeAndResolveInclude(fromPattern, basePath)

  const sort = item.sort ?? null

  const recursive = item.recursive ?? null

  const entryFile = match(recursive)
    .with(true, () => item.entryFile)
    .otherwise(() => null)

  const exclude = match(item.exclude)
    .with(P.nonNullable, (ex) => [...ex])
    .otherwise(() => null)

  const frontmatter = item.frontmatter ?? null

  return omitBy(
    {
      ...base,
      include: resolvedInclude,
      items: item.items,
      sort,
      recursive,
      entryFile,
      exclude,
      frontmatter,
    },
    isUndefined
  ) as Section
}

/**
 * Return the link as a single-element array, or empty if undefined.
 *
 * @private
 * @param link - Optional link string
 * @returns Array with the link, or empty array
 */
function collectSelfLinks(link: string | undefined): string[] {
  if (!isNil(link)) {
    return [link]
  }
  return []
}

/**
 * Collect links from nested section items.
 *
 * @private
 * @param items - Optional array of child sections
 * @returns Array of link strings from nested items
 */
function collectNestedLinks(items: readonly Section[] | undefined): string[] {
  if (items) {
    return [...collectAllLinks(items)]
  }
  return []
}

/**
 * Recursively enrich child items with workspace card metadata.
 *
 * @private
 * @param items - Optional child entries to enrich
 * @param workspaceItems - Workspace items containing card metadata
 * @returns Enriched entries or undefined if no items
 */
function resolveEnrichedItems(
  items: readonly ResolvedEntry[] | undefined,
  workspaceItems: readonly Workspace[]
): ResolvedEntry[] | undefined {
  if (items) {
    return enrichEntries(items, workspaceItems)
  }
  return undefined
}

/**
 * Copy tags array, or return undefined if not present.
 *
 * @private
 * @param tags - Optional tags array
 * @returns Copied tags array or undefined
 */
function resolveTags(tags: readonly string[] | undefined): string[] | undefined {
  if (tags) {
    return [...tags]
  }
  return undefined
}

/**
 * Copy badge object, or return undefined if not present.
 *
 * @private
 * @param badge - Optional badge with src and alt
 * @returns Copied badge object or undefined
 */
function resolveBadge(
  badge: { readonly src: string; readonly alt: string } | undefined
): { readonly src: string; readonly alt: string } | undefined {
  if (badge) {
    return { src: badge.src, alt: badge.alt }
  }
  return undefined
}

/**
 * Normalize include (string | string[]) and resolve relative to base path.
 *
 * @private
 * @param include - Include pattern(s) from workspace
 * @param basePath - Base directory path to resolve relative to
 * @returns Resolved include pattern(s) as string or string[]
 */
function normalizeAndResolveInclude(
  include: string | readonly string[],
  basePath: string
): string | readonly string[] {
  if (isString(include)) {
    return `${basePath}/${include}`
  }
  return include.map((pattern) => `${basePath}/${pattern}`)
}

/**
 * Resolve a default description for well-known workspace category titles.
 *
 * @private
 * @param title - Category title config
 * @returns Default description string, or empty string for unknown titles
 */
function resolveDefaultCategoryDescription(title: TitleConfig): string {
  const key = String(title).toLowerCase()
  return DEFAULT_CATEGORY_DESCRIPTIONS[key] ?? ''
}
