export {
  defineConfig,
  loadConfig,
  sync,
  resolveEntries,
  loadManifest,
  createPaths,
  hasGlobChars,
} from '@zpress/core'

export { defineTheme } from '@zpress/core'
export { createRspressConfig, zpressPlugin } from '@zpress/ui'

// Config types — what consumers fill in when writing `zpress.config.ts`.
export type {
  ZpressConfig,
  Section,
  Feature,
  Workspace,
  WorkspaceGroup,
  Frontmatter,
  NavItem,
  CardConfig,
  SidebarConfig,
  SidebarLink,
  ResolvedPage,
  ResolvedSection,
  Result,
  TitleConfig,
  HeroAction,
  HomeConfig,
  HomeTrustConfig,
  HomeCtaConfig,
  HomeGridConfig,
  TruncateConfig,
  AnnouncementConfig,
  SiteConfig,
  SiteEditConfig,
  SiteReportConfig,
  SiteSidebarPromoConfig,
  SiteCtaConfig,
  SiteFooterColumn,
  SiteFooterConfig,
  FooterConfig,
  SocialLink,
  SocialLinkIcon,
  OpenAPIConfig,
  IconConfig,
  IconColor,
  IconId,
  IconPrefix,
} from '@zpress/core'

// Theme types — what `defineTheme` accepts and returns.
export type {
  ZpressTheme,
  ZpressThemeInput,
  ZpressThemeInputVariants,
  ZpressTokens,
  ThemeVariant,
  ThemeVariantTokens,
  ThemeName,
  ThemeColors,
  ThemeConfig,
  BuiltInThemeName,
  BuiltInIconColor,
} from '@zpress/core'

// Config loader option types.
export type { LoadConfigOptions } from '@zpress/core'

// Sync engine types — exposed for advanced consumers running `sync` /
// `loadManifest` directly. Most users don't touch these.
export type {
  Paths,
  SyncResult,
  SyncOptions,
  SyncContext,
  PageData,
  ResolvedEntry,
  SidebarItem,
  Manifest,
  ManifestEntry,
} from '@zpress/core'
