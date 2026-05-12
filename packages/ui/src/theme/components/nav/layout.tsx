import { useFrontmatter } from '@rspress/core/runtime'
import { Layout as OriginalLayout } from '@rspress/core/theme-original'
import type React from 'react'
import { match } from 'ts-pattern'

import { useZpress } from '../../hooks/use-zpress'
import { AnnouncementBar } from '../announcement/announcement-bar'
import { ContentFooterPortal } from '../content-footer/content-footer-portal'
import { Feedback } from '../content-footer/feedback'
import { MetaActions } from '../content-footer/meta-actions'
import { SiteFooter } from '../footer/site-footer'
import { SidebarLinks } from '../sidebar/sidebar-links'
import { SidebarPromo } from '../sidebar/sidebar-promo'
import { SidebarToggle } from '../sidebar/sidebar-toggle'
import { BranchTag } from './branch-tag'
import { MobileNavCTA } from './mobile-nav-cta'
import { ThemeSwitcher } from './theme-switcher'
import { TopbarCTA } from './topbar-cta'
import { VersionChip } from './version-chip'
import { VscodeTag } from './vscode-tag'

declare const __ZPRESS_VSCODE__: boolean

/**
 * Custom Layout override for zpress.
 *
 * Wires the approved mockup chrome:
 * - AnnouncementBar via the `top` slot (above the topbar)
 * - SidebarToggle + VersionChip + BranchTag (+ VscodeTag) on the topbar left
 * - ThemeSwitcher + Get-started CTA on the topbar right
 * - SidebarLinks (above/below) from config
 * - SidebarPromo at the bottom of the sidebar
 * - SiteFooter via the `bottom` slot (docs only — home renders it inside PageRail)
 *
 * @returns React element with the custom layout
 */
export function Layout(): React.ReactElement {
  const { sidebarAbove, sidebarBelow, announcement } = useZpress()
  const { frontmatter } = useFrontmatter()
  const isHome = (frontmatter as Record<string, unknown>).pageType === 'home'

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

  const navSlot = match(__ZPRESS_VSCODE__)
    .with(true, () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sidebarToggle}
        <VersionChip version="v0.5" />
        <BranchTag />
        <VscodeTag />
      </div>
    ))
    .otherwise(() => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sidebarToggle}
        <VersionChip version="v0.5" />
        <BranchTag />
      </div>
    ))

  const afterNavSlot = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ThemeSwitcher />
      <TopbarCTA text="Get started →" href="/getting-started/quick-start" />
      <MobileNavCTA text="Get started →" href="/getting-started/quick-start" />
    </div>
  )

  const aboveItems = sidebarAbove ?? []
  const belowItems = sidebarBelow ?? []

  const beforeSidebar = match(aboveItems.length > 0)
    .with(true, () => <SidebarLinks items={aboveItems} position="above" />)
    .otherwise(() => null)

  const afterSidebar = (
    <>
      {match(belowItems.length > 0)
        .with(true, () => <SidebarLinks items={belowItems} position="below" />)
        .otherwise(() => null)}
      <SidebarPromo
        title="Ship docs that stay in sync"
        body="Pull docs from your codebase and keep them green automatically."
        ctaText="Try Joggr →"
        ctaHref="https://joggr.io"
      />
    </>
  )

  // Home pages render SiteFooter inside their PageRail; doc pages render it
  // here via the bottom slot so it's full-width below the gutter rail.
  const bottomSlot = match(isHome)
    .with(true, () => null)
    .otherwise(() => <SiteFooter />)

  // Content footer: feedback widget + meta-actions. Portals into Rspress's
  // built-in `.rp-doc-footer` so it lives inside the doc rail at the reading
  // width. Rspress renders its own `.rp-prev-next-page` pager below — we
  // style it via CSS rather than duplicating it here.
  const afterDocSlot = (
    <ContentFooterPortal>
      <Feedback />
      <MetaActions
        actions={[
          {
            label: 'Edit this page on GitHub',
            href: '#',
            icon: <EditIcon />,
          },
          {
            label: 'Report an issue',
            href: '#',
            icon: <AlertIcon />,
          },
        ]}
      />
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
