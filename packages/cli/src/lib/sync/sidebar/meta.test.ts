import { describe, expect, it } from 'vitest'

import type { ResolvedEntry } from '../types'
import { buildMetaDirectories, buildRootMeta } from './meta'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Simulates the packages section from zpress.config.ts where each package
 * section has a landing page leaf that shares the same path as the parent.
 *
 * ```
 * packages/
 *   cli.md          ← leaf "Overview" at /packages/cli
 *   cli/
 *     changelog.md  ← leaf "Changelog" at /packages/cli/changelog
 * ```
 */
function makePackageSection(params: {
  readonly name: string
  readonly label: string
}): ResolvedEntry {
  const { name, label } = params
  return {
    title: label,
    link: `/packages/${name}`,
    items: [
      {
        title: 'Overview',
        link: `/packages/${name}`,
        page: { outputPath: `packages/${name}.md`, frontmatter: {} },
      },
      {
        title: 'Changelog',
        link: `/packages/${name}/changelog`,
        page: { outputPath: `packages/${name}/changelog.md`, frontmatter: {} },
      },
    ],
  }
}

/**
 * Simulates a package section with only a landing page and no subdirectory
 * content (e.g., @zpress/templates has no Changelog).
 */
function makePackageSectionNoSubdir(params: {
  readonly name: string
  readonly label: string
}): ResolvedEntry {
  const { name, label } = params
  return {
    title: label,
    link: `/packages/${name}`,
    items: [
      {
        title: 'Overview',
        link: `/packages/${name}`,
        page: { outputPath: `packages/${name}.md`, frontmatter: {} },
      },
    ],
  }
}

const packagesRoot: ResolvedEntry = {
  title: 'Packages',
  link: '/packages',
  items: [
    makePackageSection({ name: 'zpress', label: '@zpress/kit' }),
    makePackageSection({ name: 'cli', label: '@zpress/cli' }),
    makePackageSection({ name: 'config', label: '@zpress/config' }),
    makePackageSection({ name: 'core', label: '@zpress/core' }),
    makePackageSection({ name: 'ui', label: '@zpress/ui' }),
    makePackageSection({ name: 'theme', label: '@zpress/theme' }),
    makePackageSectionNoSubdir({ name: 'templates', label: '@zpress/templates' }),
  ],
}

const referenceRoot: ResolvedEntry = {
  title: 'Reference',
  link: '/references',
  root: true,
  items: [
    {
      title: 'API',
      link: '/references/api',
      items: [
        {
          title: 'Auth',
          link: '/references/api/auth',
          page: { outputPath: 'references/api/auth.md', frontmatter: {} },
        },
      ],
    },
    {
      title: 'CLI',
      link: '/references/cli',
      items: [
        {
          title: 'Commands',
          link: '/references/cli/commands',
          page: { outputPath: 'references/cli/commands.md', frontmatter: {} },
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// buildRootMeta
// ---------------------------------------------------------------------------

describe('buildRootMeta()', () => {
  it('should include visible top-level sections', () => {
    const entries: readonly ResolvedEntry[] = [
      {
        title: 'Getting Started',
        link: '/getting-started',
        items: [{ title: 'Intro', link: '/getting-started/intro' }],
      },
      { title: 'Packages', link: '/packages', items: [] },
    ]

    const result = buildRootMeta(entries)

    expect(result).toStrictEqual([
      { type: 'dir', name: 'getting-started', label: 'Getting Started' },
      { type: 'dir', name: 'packages', label: 'Packages' },
    ])
  })

  it('should exclude hidden sections', () => {
    const entries: readonly ResolvedEntry[] = [
      { title: 'Visible', link: '/visible', items: [] },
      { title: 'Hidden', link: '/hidden', hidden: true, items: [] },
    ]

    const result = buildRootMeta(entries)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'visible' })
  })

  it('should promote root section children to top-level meta items', () => {
    const entries: readonly ResolvedEntry[] = [
      { title: 'Getting Started', link: '/getting-started', items: [] },
      referenceRoot,
    ]

    const result = buildRootMeta(entries)

    expect(result).toStrictEqual([
      { type: 'dir', name: 'getting-started', label: 'Getting Started' },
      { type: 'dir', name: 'api', label: 'API' },
      { type: 'dir', name: 'cli', label: 'CLI' },
    ])
  })

  it('should not include root section parent as a meta item', () => {
    const entries: readonly ResolvedEntry[] = [referenceRoot]

    const result = buildRootMeta(entries)

    const names = result
      .filter(
        (item): item is { readonly type: string; readonly name: string; readonly label: string } =>
          'name' in item
      )
      .map((item) => item.name)
    expect(names).not.toContain('references')
  })

  it('should exclude hidden children from root section promotion', () => {
    const rootWithHidden: ResolvedEntry = {
      title: 'Reference',
      link: '/references',
      root: true,
      items: [
        { title: 'API', link: '/references/api', items: [] },
        { title: 'Internal', link: '/references/internal', hidden: true, items: [] },
      ],
    }

    const result = buildRootMeta([rootWithHidden])

    expect(result).toStrictEqual([{ type: 'file', name: 'api', label: 'API' }])
  })
})

// ---------------------------------------------------------------------------
// buildMetaDirectories
// ---------------------------------------------------------------------------

describe('buildMetaDirectories()', () => {
  it('should use the section title when a leaf and section share the same name', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const packagesDir = directories.find((d) => d.dirPath === 'packages')

    expect(packagesDir).toBeDefined()
    const cliItem = packagesDir!.items.find(
      (item) => typeof item === 'object' && 'name' in item && item.name === 'cli'
    )

    expect(cliItem).toMatchObject({ type: 'dir', name: 'cli', label: '@zpress/cli' })
  })

  it('should not produce duplicate entries for same-name leaf and section', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const packagesDir = directories.find((d) => d.dirPath === 'packages')

    expect(packagesDir).toBeDefined()
    const cliItems = packagesDir!.items.filter(
      (item) => typeof item === 'object' && 'name' in item && item.name === 'cli'
    )

    expect(cliItems).toHaveLength(1)
  })

  it('should place child leaves in the correct subdirectory', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const cliDir = directories.find((d) => d.dirPath === 'packages/cli')

    expect(cliDir).toBeDefined()
    expect(cliDir!.items).toContainEqual({ type: 'file', name: 'changelog', label: 'Changelog' })
  })

  it('should preserve config order for sections in the same directory', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const packagesDir = directories.find((d) => d.dirPath === 'packages')

    expect(packagesDir).toBeDefined()
    const names = packagesDir!.items
      .filter(
        (item): item is { readonly type: string; readonly name: string; readonly label: string } =>
          typeof item === 'object' && 'name' in item
      )
      .map((item) => item.name)

    expect(names).toStrictEqual(['zpress', 'cli', 'config', 'core', 'ui', 'theme', 'templates'])
  })

  it('should emit file type with section label when section has no subdirectory content', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const packagesDir = directories.find((d) => d.dirPath === 'packages')

    expect(packagesDir).toBeDefined()
    const templatesItem = packagesDir!.items.find(
      (item) => typeof item === 'object' && 'name' in item && item.name === 'templates'
    )

    expect(templatesItem).toMatchObject({
      type: 'file',
      name: 'templates',
      label: '@zpress/templates',
    })
  })

  it('should preserve all package sections in the packages directory', () => {
    const directories = buildMetaDirectories([packagesRoot])
    const packagesDir = directories.find((d) => d.dirPath === 'packages')

    expect(packagesDir).toBeDefined()
    const names = packagesDir!.items
      .filter(
        (item): item is { readonly type: string; readonly name: string; readonly label: string } =>
          typeof item === 'object' && 'name' in item
      )
      .map((item) => item.name)

    expect(names).toContain('cli')
    expect(names).toContain('core')
    expect(names).toContain('ui')
  })

  it('should flatten root section children without emitting parent directory group', () => {
    const directories = buildMetaDirectories([referenceRoot])

    const dirPaths = directories.map((d) => d.dirPath)
    expect(dirPaths).not.toContain('references')
  })

  it('should emit subdirectories for root section children', () => {
    const directories = buildMetaDirectories([referenceRoot])

    const apiDir = directories.find((d) => d.dirPath === 'references/api')
    expect(apiDir).toBeDefined()
    expect(apiDir!.items).toContainEqual({ type: 'file', name: 'auth', label: 'Auth' })

    const cliDir = directories.find((d) => d.dirPath === 'references/cli')
    expect(cliDir).toBeDefined()
    expect(cliDir!.items).toContainEqual({ type: 'file', name: 'commands', label: 'Commands' })
  })

  it('should handle mix of root and non-root sections', () => {
    const directories = buildMetaDirectories([packagesRoot, referenceRoot])

    const dirPaths = directories.map((d) => d.dirPath)
    expect(dirPaths).toContain('packages')
    expect(dirPaths).not.toContain('references')
    expect(dirPaths).toContain('references/api')
    expect(dirPaths).toContain('references/cli')
  })

  it('should preserve leaf-before-section order when names do not collide', () => {
    const mixedSection: ResolvedEntry = {
      title: 'Mixed',
      link: '/mixed',
      items: [
        {
          title: 'Intro',
          link: '/mixed/intro',
          page: { outputPath: 'mixed/intro.md', frontmatter: {} },
        },
        {
          title: 'API',
          link: '/mixed/api',
          items: [
            {
              title: 'Auth',
              link: '/mixed/api/auth',
              page: { outputPath: 'mixed/api/auth.md', frontmatter: {} },
            },
          ],
        },
        {
          title: 'FAQ',
          link: '/mixed/faq',
          page: { outputPath: 'mixed/faq.md', frontmatter: {} },
        },
      ],
    }

    const directories = buildMetaDirectories([mixedSection])
    const mixedDir = directories.find((d) => d.dirPath === 'mixed')

    expect(mixedDir).toBeDefined()
    const names = mixedDir!.items
      .filter(
        (item): item is { readonly type: string; readonly name: string; readonly label: string } =>
          typeof item === 'object' && 'name' in item
      )
      .map((item) => item.name)

    expect(names).toStrictEqual(['intro', 'faq', 'api'])
  })
})
