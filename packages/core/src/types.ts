export type {
  ZpressConfig,
  ThemeName,
  IconColor,
  IconId,
  IconConfig,
  ThemeColors,
  ThemeConfig,
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
