import fs from 'node:fs/promises'

import { resolveOptionalIcon, serializeIcon } from '@zpress/config'
import type { IconColor } from '@zpress/config'
import { match, P } from 'massaman/match'

import { parse as parseFrontmatter } from '../frontmatter.ts'
import type { ResolvedEntry } from '../types.ts'

/**
 * Input data for building a workspace card JSX string.
 */
export interface WorkspaceCardData {
  /**
   * Card link target.
   */
  readonly link: string
  /**
   * Display name for the card.
   */
  readonly title: string
  /**
   * Icon config — Iconify identifier string or `{ id, color }` object.
   */
  readonly icon?: string | { readonly id: string; readonly color: string }
  /**
   * Scope label shown above the name (e.g. 'apps/').
   */
  readonly scope?: string
  /**
   * Short description shown on the card.
   */
  readonly description?: string
  /**
   * Technology tags — kebab-case tag keys resolved by UI TechTag.
   */
  readonly tags?: readonly string[]
  /**
   * Deploy badge image.
   */
  readonly badge?: { readonly src: string; readonly alt: string }
  /**
   * Whether this entry has sub-items (used for default icon selection).
   */
  readonly hasChildren?: boolean
}

/**
 * Generate section landing page MDX from resolved children.
 *
 * Uses **workspace cards** when any child has `card` metadata
 * (richer cards with scope, tags, deploy badges — like the homepage).
 * Falls back to **section cards** (simple icon + title + description).
 *
 * @param sectionText - Section heading text
 * @param description - Optional section description
 * @param children - Resolved child entries
 * @param iconColor - Color theme for section card icons
 * @returns MDX string with React component imports and JSX elements
 */
export async function generateLandingContent(
  sectionText: string,
  description: string | undefined,
  children: readonly ResolvedEntry[],
  iconColor: IconColor
): Promise<string> {
  const visible = children.filter((c) => !c.hidden && c.link)
  const useWorkspace = visible.some((c) => c.card)

  const descLine = match(description)
    .with(P.nonNullable, (d) => `\n${d}\n`)
    .otherwise(() => '')

  const imports =
    'import { WorkspaceCard, WorkspaceGrid, SectionCard, SectionGrid } from ' +
    "'@zpress/ui/theme'\n\n"

  if (useWorkspace) {
    const cards = await Promise.all(visible.map((child) => buildWorkspaceCard(child)))
    const grid = cards.join('\n')
    return `${imports}# ${sectionText}\n${descLine}\n<WorkspaceGrid>\n${grid}\n</WorkspaceGrid>\n`
  }

  const cards = await Promise.all(visible.map((child) => buildSectionCard(child, iconColor)))
  const grid = cards.join('\n')
  return `${imports}# ${sectionText}\n${descLine}\n<SectionGrid>\n${grid}\n</SectionGrid>\n`
}

/**
 * Build a workspace card JSX string from structured data.
 *
 * Shared builder used by both the landing page generator (for resolved entries)
 * and the workspace module (for WorkspaceItem arrays).
 *
 * @param data - Card data with link, text, icon, tags, etc.
 * @returns JSX string for a single WorkspaceCard component
 */
export function buildWorkspaceCardJsx(data: WorkspaceCardData): string {
  const defaultIcon = match(data.hasChildren === true)
    .with(true, () => 'pixelarticons:folder')
    .otherwise(() => 'pixelarticons:file')
  const icon = data.icon ?? defaultIcon

  const props: readonly string[] = [
    `title="${escapeJsxProp(data.title)}"`,
    `href="${data.link}"`,
    ...serializeIconProp(icon),
    ...maybeScopeProp(data.scope),
    ...maybeDescriptionProp(data.description),
    ...maybeTagsProp(data.tags),
    ...maybeBadgeProp(data.badge),
  ]

  return `  <WorkspaceCard ${props.join(' ')} />`
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a workspace card JSX string from a resolved entry with card metadata.
 *
 * @private
 * @param entry - Resolved entry with card metadata
 * @returns JSX string for a WorkspaceCard component
 */
async function buildWorkspaceCard(entry: ResolvedEntry): Promise<string> {
  const card = entry.card ?? {}
  const description = card.description ?? (await resolveDescription(entry))
  const resolved = resolveOptionalIcon(card.icon)

  return buildWorkspaceCardJsx({
    link: entry.link ?? '',
    title: entry.title,
    icon: serializeIcon(resolved),
    scope: card.scope,
    description,
    tags: card.tags,
    badge: card.badge,
    hasChildren: entry.items !== null && entry.items !== undefined && entry.items.length > 0,
  })
}

/**
 * Build a section card JSX string from a resolved entry.
 *
 * @private
 * @param entry - Resolved entry to render as a card
 * @param iconColor - Color theme for the icon
 * @returns JSX string for a single SectionCard component
 */
async function buildSectionCard(entry: ResolvedEntry, iconColor: IconColor): Promise<string> {
  const hasChildren = entry.items && entry.items.length > 0
  const iconId = match(hasChildren)
    .with(true, () => 'pixelarticons:folder')
    .otherwise(() => 'pixelarticons:file')
  const icon: string | { readonly id: string; readonly color: string } = match(iconColor)
    .with('purple', () => iconId)
    .otherwise(() => ({ id: iconId, color: iconColor }))
  const description = await resolveDescription(entry)

  const baseProps = [
    `href="${entry.link}"`,
    `title="${escapeJsxProp(entry.title)}"`,
    ...serializeIconProp(icon),
  ]
  const descriptionProps = match(description)
    .with(P.string, (d) => [`description="${escapeJsxProp(d)}"`])
    .otherwise(() => [] as string[])
  const allProps = [...baseProps, ...descriptionProps]

  return `  <SectionCard ${allProps.join(' ')} />`
}

/**
 * Resolve a description for a card.
 * Priority: card.description > source file frontmatter > first paragraph > page frontmatter.
 *
 * @private
 * @param entry - Resolved entry to extract description from
 * @returns Description string, or undefined if none found
 */
async function resolveDescription(entry: ResolvedEntry): Promise<string | undefined> {
  // 1. Source file frontmatter is the primary source of truth
  if (entry.page !== null && entry.page !== undefined && entry.page.source) {
    try {
      const desc = await extractDescription(entry.page.source)
      if (desc) {
        return desc
      }
    } catch {
      // ignore
    }
  }

  // 2. Config-level description as fallback (no file, or file has no description)
  if (entry.description) {
    return entry.description
  }

  return undefined
}

/**
 * Extract a short description from a markdown file.
 * Checks frontmatter `description` first, then first paragraph after heading.
 *
 * @private
 * @param sourcePath - Absolute path to the markdown file
 * @returns Description string, or undefined if none found
 */
async function extractDescription(sourcePath: string): Promise<string | undefined> {
  const raw = await fs.readFile(sourcePath, 'utf8')
  const { data, content } = parseFrontmatter(raw)

  if (data.description) {
    return String(data.description)
  }

  // First non-empty paragraph after the first heading
  const lines = content.split('\n')
  const headingIdx = lines.findIndex((l) => l.startsWith('#'))
  const para: readonly string[] = resolveParagraph(lines, headingIdx)

  if (para.length > 0) {
    return para.join(' ')
  }
}

/**
 * Escape special characters in JSX prop values.
 *
 * @private
 * @param str - Raw string to escape for use in JSX attribute values
 * @returns Escaped string safe for JSX prop interpolation
 */
function escapeJsxProp(str: string): string {
  return str.replaceAll('"', '&quot;').replaceAll('{', '&#123;').replaceAll('}', '&#125;')
}

/**
 * Extract the first non-empty paragraph after a heading from markdown lines.
 *
 * @private
 * @param lines - Array of markdown lines
 * @param headingIdx - Index of the heading line (-1 if none found)
 * @returns Array of trimmed paragraph lines
 */
function resolveParagraph(lines: readonly string[], headingIdx: number): readonly string[] {
  if (headingIdx === -1) {
    return []
  }

  return lines
    .slice(headingIdx + 1)
    .reduce<{ readonly done: boolean; readonly result: readonly string[] }>(
      (acc, line) => {
        if (acc.done) {
          return acc
        }
        if (line.startsWith('#')) {
          return { done: true, result: acc.result }
        }

        const trimmed = line.trim()
        if (trimmed === '' && acc.result.length > 0) {
          return { done: true, result: acc.result }
        }
        if (trimmed === '') {
          return acc
        }
        // Skip raw HTML / dividers
        if (trimmed.startsWith('<') || trimmed.startsWith('---')) {
          return acc
        }

        return { done: false, result: [...acc.result, trimmed] }
      },
      { done: false, result: [] }
    ).result
}

/**
 * Serialize a unified icon config into JSX prop strings.
 *
 * - String → `icon="prefix:name"`
 * - Object → `icon={{ id: "prefix:name", color: "blue" }}`
 *
 * @private
 * @param icon - Icon config value (string or object)
 * @returns Array with the icon JSX prop string
 */
function serializeIconProp(
  icon: string | { readonly id: string; readonly color: string }
): readonly string[] {
  if (typeof icon === 'string') {
    return [`icon="${icon}"`]
  }
  return [`icon={{ id: "${icon.id}", color: "${icon.color}" }}`]
}

/**
 * Return a scope JSX prop array if scope is defined.
 *
 * @private
 * @param scope - Optional scope string
 * @returns Array with scope prop string, or empty
 */
function maybeScopeProp(scope: string | undefined): readonly string[] {
  if (scope) {
    return [`scope="${escapeJsxProp(scope)}"`]
  }
  return []
}

/**
 * Return a description JSX prop array if description is defined.
 *
 * @private
 * @param description - Optional description string
 * @returns Array with description prop string, or empty
 */
function maybeDescriptionProp(description: string | undefined): readonly string[] {
  if (description) {
    return [`description="${escapeJsxProp(description)}"`]
  }
  return []
}

/**
 * Return a tags JSX prop array if tags are present and non-empty.
 *
 * @private
 * @param tags - Optional array of tag strings
 * @returns Array with tags prop string, or empty
 */
function maybeTagsProp(tags: readonly string[] | undefined): readonly string[] {
  if (tags && tags.length > 0) {
    return [`tags={${JSON.stringify(tags)}}`]
  }
  return []
}

/**
 * Return a badge JSX prop array if badge is defined.
 *
 * @private
 * @param badge - Optional badge object with src and alt
 * @returns Array with badge prop string, or empty
 */
function maybeBadgeProp(
  badge: { readonly src: string; readonly alt: string } | undefined
): readonly string[] {
  if (badge) {
    return [`badge={${JSON.stringify(badge)}}`]
  }
  return []
}
