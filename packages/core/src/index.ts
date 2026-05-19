export type {
  ZpressConfig,
  Section,
  Feature,
  Workspace,
  WorkspaceGroup,
  Frontmatter,
  NavItem,
  CardConfig,
  ResolvedPage,
  ResolvedSection,
  Result,
  TitleConfig,
  HeroAction,
  SidebarConfig,
  SidebarLink,
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
} from './types.ts'

export type { IconConfig, IconColor, ResolvedIcon } from './icon.ts'
export { resolveIcon, resolveOptionalIcon, serializeIcon, ICON_COLORS } from './icon.ts'
export type { IconId, IconPrefix } from './icons.generated.ts'
export { ICON_PREFIXES } from './icons.generated.ts'

export { defineConfig, validateConfig } from './define-config.ts'
export { loadConfig } from './config.ts'

export type { ThemeConfig, ThemeName, ThemeColors } from './theme.ts'
export { THEME_NAMES } from './theme.ts'

export type {
  BuiltInThemeName,
  BuiltInIconColor,
  ThemeVariant,
  ZpressTheme,
  ZpressThemeInput,
  ZpressThemeInputVariants,
  ZpressTokens,
  ThemeVariantTokens,
} from '@zpress/theme'
export { defineTheme, resolveDefaultVariant, resolveThemeVariants } from '@zpress/theme'

export type { LoadConfigOptions } from '@zpress/config'

export { sync, type SyncResult, type SyncOptions } from './sync/index.ts'
export { resolveEntries } from './sync/resolve/index.ts'
export { loadManifest } from './sync/manifest.ts'
export type {
  SyncContext,
  PageData,
  ResolvedEntry,
  SidebarItem,
  Manifest,
  ManifestEntry,
} from './sync/types.ts'
export type { SyncError, SyncOutcome, ConfigError, ConfigResult } from './sync/errors.ts'
export { syncError, configError } from './sync/errors.ts'
export type { ConfigWarning, ConfigWarningType } from '@zpress/config'
export { checkWorkspaceIncludes } from './sync/workspace.ts'

export {
  generateAssets,
  generateBannerSvg,
  generateIconSvg,
  generateLogoSvg,
} from './banner/index.ts'
export type { AssetConfig, AssetError, AssetResult, GeneratedAsset } from './banner/index.ts'

export { createPaths } from './paths.ts'
export type { Paths } from './paths.ts'

export { hasGlobChars, normalizeInclude, isSingleFileInclude, hasAnyGlobInclude } from './glob.ts'
