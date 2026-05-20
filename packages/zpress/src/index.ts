export { defineConfig, defineTheme, hasGlobChars } from '@zpress/config'
export { ZpressLogo } from '@zpress/ui'
export type { ZpressLogoProps } from '@zpress/ui'

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
  LogoConfig,
  LogoContext,
  LogoFn,
  LogoImage,
} from '@zpress/config'

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
} from '@zpress/theme'

// Config loader option types.
export type { LoadConfigOptions } from '@zpress/config'
