export type {
  ZpressConfig,
  ThemeName,
  IconColor,
  IconId,
  IconConfig,
  ColorMode,
  ThemeColors,
  ThemeConfig,
  Frontmatter,
  NavItem,
  CardConfig,
  Section,
  Workspace,
  WorkspaceCategory,
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
  AnnouncementConfig,
  SiteConfig,
  SiteEditConfig,
  SiteReportConfig,
  SiteSidebarPromoConfig,
  SiteCtaConfig,
  SiteFooterColumn,
  SiteFooterConfig,
  Result,
} from '@zpress/config'

/**
 * Convert an unknown caught value to an `Error` instance.
 *
 * @param error - The unknown value from a catch clause
 * @returns An `Error` instance
 */
// See https://github.com/joggrdocs/zpress/issues/73 — replace with shared toError util
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(String(error))
}
