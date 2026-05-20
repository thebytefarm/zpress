import { ICON_COLORS, resolveOptionalIcon, serializeIcon } from '@zpress/config'
import type { IconColor, Section, Workspace } from '@zpress/config'
import { match, P } from 'massaman/match'

import { linkToOutputPath } from '../resolve/path.ts'
import type { ResolvedEntry } from '../types.ts'
import { buildWorkspaceCardJsx, generateLandingContent } from './landing.ts'

/**
 * Walk the resolved tree and inject virtual landing pages
 * for any section that has a `link` and children but no page of its own.
 *
 * Landing pages with React components use `.mdx` extension;
 * simple text pages stay as `.md`.
 *
 * @param entries - Resolved entry tree to walk
 * @param configSections - Original config sections for metadata lookup
 * @param workspaces - Workspace items for generating workspace landing pages
 * @param colorIndex - Mutable color index counter for cycling icon colors
 * @returns Void; mutates entries in-place
 */
export function injectLandingPages(
  entries: readonly ResolvedEntry[],
  configSections: readonly Section[],
  workspaces: readonly Workspace[],
  colorIndex: { value: number } = { value: 0 }
): void {
  entries.reduce<void>((_, entry) => {
    if (entry.link && !entry.page && entry.landing !== false) {
      const configSection = findConfigSection(configSections, entry.link)
      const description: string | undefined = resolveDescription(configSection)

      const hasSelfLinkedChild = checkHasSelfLinkedChild(entry.items, entry.link)

      if (entry.items && entry.items.length > 0 && !hasSelfLinkedChild) {
        // Generate landing page from child entries (MDX — has React components)
        const color: IconColor = ICON_COLORS[colorIndex.value % ICON_COLORS.length]
        colorIndex.value += 1

        const children = entry.items
        entry.page = {
          content: () => generateLandingContent(entry.title, description, children, color),
          outputPath: linkToOutputPath(entry.link).replace(/\.md$/, '.mdx'),
          frontmatter: {},
        }
      } else if (!entry.items || entry.items.length === 0) {
        // Check for workspace items matching this section's link prefix
        const matching = workspaces.filter((item) => item.path.startsWith(`${entry.link}/`))

        if (matching.length > 0) {
          const segments = entry.link.split('/')
          const lastSegment = segments.findLast((seg) => seg.length > 0)
          const scope = `${lastSegment}/`
          entry.page = {
            content: () => generateWorkspaceLandingPage(entry.title, description, matching, scope),
            outputPath: linkToOutputPath(entry.link).replace(/\.md$/, '.mdx'),
            frontmatter: {},
          }
        }

        if (matching.length === 0) {
          const entryLink = entry.link
          const exact = workspaces.find((item) => item.path === entryLink)
          if (exact) {
            const titleStr = match(exact.title)
              .with(P.string, (t) => t)
              .otherwise(String)
            // Simple text page — no React components, stays as .md
            entry.page = {
              content: () => `# ${titleStr}\n\n${exact.description}\n`,
              outputPath: linkToOutputPath(entryLink),
              frontmatter: {},
            }
          }
        }
      }
    }

    if (entry.items) {
      injectLandingPages(
        entry.items as readonly ResolvedEntry[],
        configSections,
        workspaces,
        colorIndex
      )
    }
  }, undefined as void)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Generate a workspace-style landing page MDX from workspace items.
 *
 * @private
 * @param heading - Page heading
 * @param description - Optional description below heading
 * @param items - Workspace items to render as cards
 * @param scopePrefix - Scope label for cards (e.g. 'apps/')
 * @returns MDX string with React component imports and JSX elements
 */
function generateWorkspaceLandingPage(
  heading: string,
  description: string | undefined,
  items: readonly Workspace[],
  scopePrefix: string
): string {
  const imports = "import { WorkspaceCard, WorkspaceGrid } from '@zpress/ui/theme'\n\n"

  const cards = items.map((item) => {
    const tags: readonly string[] | undefined = resolveTags(item.tags)
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
      tags,
      badge: item.badge,
    })
  })

  const descLine = match(description)
    .with(P.nonNullable, (d) => `\n${d}\n`)
    .otherwise(() => '')

  return `${imports}# ${heading}\n${descLine}\n<WorkspaceGrid>\n${cards.join('\n')}\n</WorkspaceGrid>\n`
}

/**
 * Look up the original config Section by link for extracting metadata.
 *
 * @private
 * @param sections - Config sections to search
 * @param link - Link path to match
 * @returns Matching section, or undefined
 */
function findConfigSection(sections: readonly Section[], link: string): Section | undefined {
  const direct = sections.find((section) => section.path === link)
  if (direct) {
    return direct
  }
  const nested = sections
    .filter((section) => section.items !== null && section.items !== undefined)
    .map((section) => findConfigSection(section.items as readonly Section[], link))
    .find((result) => result !== null && result !== undefined)
  return nested
}

/**
 * Extract description from a config section.
 *
 * @private
 * @param configSection - Optional config section
 * @returns Description string, or undefined
 */
function resolveDescription(configSection: Section | undefined): string | undefined {
  if (configSection === null || configSection === undefined) {
    return undefined
  }

  if (configSection.description) {
    return configSection.description
  }

  return undefined
}

/**
 * Check if any child entry has the same link as the parent.
 *
 * @private
 * @param items - Optional child entries
 * @param link - Parent link to check against
 * @returns True if a child has the same link
 */
function checkHasSelfLinkedChild(
  items: readonly ResolvedEntry[] | undefined,
  link: string | undefined
): boolean {
  if (items) {
    return items.some((child) => child.link === link)
  }
  return false
}

/**
 * Copy tags array, or return undefined if not present.
 *
 * @private
 * @param tags - Optional tags array
 * @returns Copied tags array or undefined
 */
function resolveTags(tags: readonly string[] | undefined): readonly string[] | undefined {
  if (tags) {
    return [...tags]
  }
  return undefined
}
