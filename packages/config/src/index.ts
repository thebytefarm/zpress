export type {
  ZpressConfig,
  ThemeName,
  IconColor,
  IconPrefix,
  IconId,
  IconConfig,
  ThemeColors,
  ThemeConfig,
  ZpressThemeInput,
  Frontmatter,
  NavItem,
  CardConfig,
  Section,
  Workspace,
  WorkspaceGroup,
  TitleConfig,
  HeroAction,
  SidebarConfig,
  SidebarLink,
  ResolvedPage,
  ResolvedSection,
  Feature,
  OpenAPIConfig,
  HomeConfig,
  HomeTrustConfig,
  HomeCtaConfig,
  SocialLinkIcon,
  SocialLink,
  FooterConfig,
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
  Result,
} from './types.ts'

export { defineConfig } from './define-config.ts'
export { loadConfig } from './loader.ts'
export type { LoadConfigOptions } from './loader.ts'

export { validateConfig } from './validator.ts'

export { zpressConfigSchema, pathsSchema } from './schema.ts'

export { configError, configErrorFromZod, configWarning } from './errors.ts'
export type {
  ConfigError,
  ConfigErrorType,
  ConfigResult,
  ConfigWarning,
  ConfigWarningType,
} from './errors.ts'

export {
  THEME_NAMES,
  ICON_COLORS,
  isBuiltInTheme,
  isBuiltInIconColor,
  defineTheme,
} from '@zpress/theme'
export type { BuiltInThemeName, BuiltInIconColor } from '@zpress/theme'
