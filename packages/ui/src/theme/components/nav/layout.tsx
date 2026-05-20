import { useFrontmatter } from '@rspress/core/runtime'
import { Layout as OriginalLayout } from '@rspress/core/theme-original'
import type { SiteEditConfig, SiteReportConfig } from '@zpress/config'
import { match, P } from 'massaman/match'
import type React from 'react'

import { useZpress } from '../../hooks/use-zpress'
import { AnnouncementBar } from '../announcement/announcement-bar'
import { ContentFooterPortal } from '../content-footer/content-footer-portal'
import { Feedback } from '../content-footer/feedback'
import type { MetaAction } from '../content-footer/meta-actions'
import { MetaActions } from '../content-footer/meta-actions'
import { SiteFooter } from '../footer/site-footer'
import { SidebarLinks } from '../sidebar/sidebar-links'
import { SidebarPromo } from '../sidebar/sidebar-promo'
import { SidebarToggle } from '../sidebar/sidebar-toggle'
import { BranchTag } from './branch-tag'
import { MobileNavCTA } from './mobile-nav-cta'
import { TopbarCTA } from './topbar-cta'
import { VersionChip } from './version-chip'
import { VscodeTag } from './vscode-tag'

declare const __ZPRESS_VSCODE__: boolean

/**
 * Custom Layout override for zpress.
 *
 * Wires the chrome described by `config.site`:
 * - AnnouncementBar via the `top` slot (when `site.announcement` is set)
 * - SidebarToggle + VersionChip + BranchTag (+ VscodeTag) on the topbar left
 * - Topbar CTA on the topbar right (when `site.topbarCta` is set)
 * - SidebarLinks (above/below) from config
 * - SidebarPromo at the bottom of the sidebar (when `site.sidebarPromo` is set)
 * - SiteFooter via the `bottom` slot (docs only — home renders it inside PageRail)
 * - MetaActions edit/report links (when `site.edit` / `site.report` are set)
 *
 * @returns React element with the custom layout
 */
export function Layout(): React.ReactElement {
  const { sidebarAbove, sidebarBelow, site } = useZpress()
  const {
    announcement,
    version,
    topbarCta,
    sidebarPromo: sidebarPromoConfig,
    edit,
    report,
  } = site ?? {}
  const { frontmatter } = useFrontmatter()
  const fmRecord = frontmatter as Record<string, unknown>
  const isHome = fmRecord.pageType === 'home'
  const isBlank = fmRecord.pageType === 'blank'
  const filepathValue = fmRecord.__filepath
  const pagePath = match(filepathValue)
    .with(P.string, (v) => v)
    .otherwise(() => '')

  const announcementSlot = match(announcement)
    .with(undefined, () => null)
    .otherwise((a) => (
      <AnnouncementBar id={a.id} lead={a.lead} cta={a.cta} persistent={a.persistent}>
        {a.message}
      </AnnouncementBar>
    ))

  // Sidebar toggle goes at the far left of the topbar — same slot the
  // mockup uses for its hamburger. Doc pages only.
  const sidebarToggle = match(isHome)
    .with(true, () => null)
    .otherwise(() => <SidebarToggle />)

  const versionChip = match(version)
    .with(undefined, () => null)
    .otherwise((v) => <VersionChip version={v} />)

  const navSlot = match(__ZPRESS_VSCODE__)
    .with(true, () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sidebarToggle}
        {versionChip}
        <BranchTag />
        <VscodeTag />
      </div>
    ))
    .otherwise(() => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sidebarToggle}
        {versionChip}
        <BranchTag />
      </div>
    ))

  const ctaButtons = match(topbarCta)
    .with(undefined, () => null)
    .otherwise((cta) => (
      <>
        <TopbarCTA text={cta.text} href={cta.href} />
        <MobileNavCTA text={cta.text} href={cta.href} />
      </>
    ))

  const afterNavSlot = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{ctaButtons}</div>
  )

  const aboveItems = sidebarAbove ?? []
  const belowItems = sidebarBelow ?? []

  const beforeSidebar = match(aboveItems.length > 0)
    .with(true, () => (
      <div className="zp-sidebar-top">
        <SidebarLinks items={aboveItems} position="above" />
      </div>
    ))
    .otherwise(() => null)

  const sidebarPromo = match(sidebarPromoConfig)
    .with(undefined, () => null)
    .otherwise((p) => (
      <SidebarPromo title={p.title} body={p.body} ctaText={p.cta.text} ctaHref={p.cta.href} />
    ))

  const belowLinks = match(belowItems.length > 0)
    .with(true, () => <SidebarLinks items={belowItems} position="below" />)
    .otherwise(() => null)

  // Wrap below-links + promo in a single sticky bottom region so they hug
  // the viewport bottom while the nav tree scrolls between them and the
  // sticky top region. Only render the wrapper when there's something to
  // pin — otherwise the sidebar scrolls cleanly with no empty band.
  const afterSidebar = match(belowLinks === null && sidebarPromo === null)
    .with(true, () => null)
    .otherwise(() => (
      <div className="zp-sidebar-bottom">
        {belowLinks}
        {sidebarPromo}
      </div>
    ))

  // Home pages render SiteFooter inside their PageRail; blank pages are
  // chromeless by design (no nav, no footer); doc pages render the footer
  // here via the bottom slot so it's full-width below the gutter rail.
  const bottomSlot = match(isHome || isBlank)
    .with(true, () => null)
    .otherwise(() => <SiteFooter />)

  // Content footer: feedback widget + meta-actions. Portals into Rspress's
  // built-in `.rp-doc-footer` so it lives inside the doc rail at the reading
  // width. Rspress renders its own `.rp-prev-next-page` pager below — we
  // style it via CSS rather than duplicating it here.
  const metaActions = collectMetaActions({
    edit,
    report,
    pagePath,
  })

  const afterDocSlot = (
    <ContentFooterPortal>
      <Feedback />
      <MetaActions actions={metaActions} />
    </ContentFooterPortal>
  )

  return (
    <OriginalLayout
      top={announcementSlot}
      beforeNavMenu={navSlot}
      afterNavMenu={afterNavSlot}
      beforeSidebar={beforeSidebar}
      afterSidebar={afterSidebar}
      afterDoc={afterDocSlot}
      bottom={bottomSlot}
    />
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build the list of `MetaAction`s to render under each doc page, derived
 * from `site.edit` and `site.report`. Returns an empty array when neither
 * is configured — `MetaActions` then renders nothing.
 *
 * @private
 * @param params - Site edit/report config plus current page path
 * @returns Ordered list of meta actions (edit first, report second)
 */
function collectMetaActions(params: {
  readonly edit: SiteEditConfig | undefined
  readonly report: SiteReportConfig | undefined
  readonly pagePath: string
}): readonly MetaAction[] {
  const { edit, report, pagePath } = params
  const editAction = match(edit)
    .with(undefined, () => null)
    .otherwise(
      (e): MetaAction => ({
        label: e.label ?? 'Edit this page on GitHub',
        href: buildEditUrl(e, pagePath),
        icon: <EditIcon />,
      })
    )
  const reportAction = match(report)
    .with(undefined, () => null)
    .otherwise(
      (r): MetaAction => ({
        label: r.label ?? 'Report an issue',
        href: buildReportUrl(r),
        icon: <AlertIcon />,
      })
    )
  return [editAction, reportAction].filter((a): a is MetaAction => a !== null)
}

/**
 * Compose the "edit this page" URL from `SiteEditConfig` and the current
 * page path.
 *
 * @private
 * @param edit - Resolved edit config
 * @param pagePath - Relative path of the current page (may be empty)
 * @returns Fully qualified GitHub edit URL
 */
function buildEditUrl(edit: SiteEditConfig, pagePath: string): string {
  if (edit.repo.startsWith('http')) {
    return edit.repo
  }
  const branch = edit.branch ?? 'main'
  const directory = match(edit.directory)
    .with(undefined, () => '')
    .otherwise((d) => `${d.replaceAll(/^\/+|\/+$/g, '')}/`)
  const path = pagePath.replace(/^\/+/, '')
  return `https://github.com/${edit.repo}/edit/${branch}/${directory}${path}`
}

/**
 * Compose the "report an issue" URL from `SiteReportConfig`.
 *
 * @private
 * @param report - Resolved report config
 * @returns Fully qualified GitHub issues URL
 */
function buildReportUrl(report: SiteReportConfig): string {
  if (report.repo.startsWith('http')) {
    return report.repo
  }
  return `https://github.com/${report.repo}/issues/new`
}

/**
 * Pencil icon for the Edit-on-GitHub action.
 *
 * @private
 * @returns SVG element.
 */
function EditIcon(): React.ReactElement {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

/**
 * Alert icon for the Report-an-issue action.
 *
 * @private
 * @returns SVG element.
 */
function AlertIcon(): React.ReactElement {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
