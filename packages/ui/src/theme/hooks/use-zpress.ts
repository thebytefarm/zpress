import { useSite } from '@rspress/core/runtime'
import type { FooterConfig, HomeConfig, SiteConfig } from '@zpress/config'

export interface ZpressSidebarItem {
  readonly text?: string
  readonly link?: string
  readonly icon?: string
  readonly items?: readonly ZpressSidebarItem[]
}

export interface ZpressSidebarLink {
  readonly text: string
  readonly link: string
  readonly icon?: string | { readonly id: string; readonly color: string }
  readonly style?: 'brand' | 'alt' | 'ghost'
  readonly shape?: 'square' | 'rounded' | 'circle'
}

export interface WorkspaceCardData {
  readonly title: string
  readonly href: string
  readonly icon: string | { readonly id: string; readonly color: string } | undefined
  readonly scope: string | undefined
  readonly description: string | undefined
  readonly tags: readonly string[]
  readonly badge: { readonly src: string; readonly alt: string } | undefined
}

export interface WorkspaceGroupData {
  readonly type: 'apps' | 'packages' | 'workspaces'
  readonly heading: string
  readonly description: string
  readonly cards: readonly WorkspaceCardData[]
}

interface ZpressThemeConfig {
  readonly sidebar: Record<string, readonly ZpressSidebarItem[]>
  readonly sidebarAbove: readonly ZpressSidebarLink[] | undefined
  readonly sidebarBelow: readonly ZpressSidebarLink[] | undefined
  readonly workspaces: readonly WorkspaceGroupData[] | undefined
  readonly standaloneScopePaths: readonly string[] | undefined
  readonly home: HomeConfig | undefined
  readonly zpressFooter: FooterConfig | undefined
  readonly site: SiteConfig | undefined
}

/**
 * Typed wrapper around Rspress `useSite()` that exposes
 * zpress-specific themeConfig fields.
 *
 * The double cast is necessary because Rspress types `themeConfig` as
 * `NormalizedThemeConfig`, but zpress injects custom fields (sidebar,
 * workspaces) via spread at build time. No Zod schema exists for runtime
 * validation yet.
 *
 * @returns zpress theme config with sidebar and workspace data.
 */
export function useZpress(): ZpressThemeConfig {
  const { site } = useSite()
  return site.themeConfig as unknown as ZpressThemeConfig
}
