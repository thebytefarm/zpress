import { Link } from '@rspress/core/runtime'
import type React from 'react'
import { match, P } from 'ts-pattern'

import { safeUrl } from '../../lib/safe-url.ts'
import { Icon } from '../shared/icon'

import './sidebar-links.css'

interface SidebarLinkItem {
  readonly text: string
  readonly link: string
  readonly icon?: string | { readonly id: string; readonly color: string }
  readonly style?: 'brand' | 'alt' | 'ghost'
  readonly shape?: 'square' | 'rounded' | 'circle'
}

interface SidebarLinksProps {
  readonly items: readonly SidebarLinkItem[]
  readonly position: 'above' | 'below'
}

/**
 * Render a group of sidebar navigation links above or below the main sidebar.
 *
 * @param props - Sidebar links props with items and position
 * @returns React element with sidebar links or null
 */
export function SidebarLinks(props: SidebarLinksProps): React.ReactElement | null {
  return match(props.items.length > 0)
    .with(true, () => (
      <nav
        className={`zp-sidebar-links zp-sidebar-links--${props.position}`}
        aria-label={`Sidebar links ${props.position}`}
      >
        {props.items.map((item) => (
          <SidebarLinkEntry key={item.link} item={item} />
        ))}
      </nav>
    ))
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render an icon from a sidebar link item's icon configuration.
 *
 * @private
 * @param icon - Icon string or object with id/color
 * @returns Icon element or null
 */
function renderIcon(icon: SidebarLinkItem['icon']): React.ReactElement | null {
  return match(icon)
    .with(P.string, (id) => <Icon icon={id} className="zp-sidebar-link-icon" />)
    .with({ id: P.string, color: P.string }, (i) => (
      <Icon icon={i.id} className="zp-sidebar-link-icon" style={{ color: i.color }} />
    ))
    .otherwise(() => null)
}

/**
 * Check whether a URL points to an external origin.
 *
 * @private
 * @param link - Link URL to check
 * @returns True when the link is absolute http(s)
 */
function isExternal(link: string): boolean {
  return link.startsWith('http://') || link.startsWith('https://')
}

/**
 * Render a single sidebar link entry with optional icon.
 * Uses client-side `Link` for internal routes, `<a>` for external URLs.
 *
 * @private
 * @param props - Props with sidebar link item
 * @returns Sidebar link element
 */
function SidebarLinkEntry({ item }: { readonly item: SidebarLinkItem }): React.ReactElement | null {
  const isCircle = item.shape === 'circle'
  const content = (
    <>
      {renderIcon(item.icon)}
      {match(isCircle)
        .with(true, () => null)
        .otherwise(() => (
          <span className="zp-sidebar-link-text">{item.text}</span>
        ))}
    </>
  )

  const variant = item.style ?? 'ghost'
  const shape = item.shape ?? 'square'
  const cls = `zp-sidebar-link zp-sidebar-link--${variant} zp-sidebar-link--${shape}`
  /* oxlint-disable unicorn/no-useless-undefined -- React aria-label expects undefined, not null */
  const ariaLabel = match(isCircle)
    .with(true, () => item.text)
    .otherwise(() => undefined)
  /* oxlint-enable unicorn/no-useless-undefined */

  const safeLink = safeUrl(item.link)
  if (safeLink === null) {
    return null
  }
  return match(isExternal(safeLink))
    .with(true, () => (
      <a
        href={safeLink}
        className={cls}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
      >
        {content}
      </a>
    ))
    .otherwise(() => (
      <Link to={safeLink} className={cls} aria-label={ariaLabel}>
        {content}
      </Link>
    ))
}
