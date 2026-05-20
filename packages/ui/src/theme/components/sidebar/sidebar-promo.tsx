import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

import './sidebar-promo.css'

export interface SidebarPromoProps {
  /**
   * Headline of the promo card.
   */
  readonly title: string
  /**
   * Body copy beneath the headline.
   */
  readonly body: string
  /**
   * CTA button label.
   */
  readonly ctaText: string
  /**
   * CTA destination URL.
   */
  readonly ctaHref: string
}

/**
 * SidebarPromo — bordered promo card pinned at the bottom of the docs
 * sidebar. Mirrors the mockup's "Ship docs that stay in sync" pattern.
 *
 * Renders `null` when `ctaHref` fails `safeUrl()` validation — the entire
 * promo card disappears rather than rendering a card whose CTA goes
 * nowhere safe.
 *
 * @param props - Promo card configuration.
 * @returns React element, or `null` when the CTA href fails URL validation.
 */
export function SidebarPromo(props: SidebarPromoProps): React.ReactElement | null {
  const ctaHref = safeUrl(props.ctaHref)
  if (ctaHref === null) {
    return null
  }
  return (
    <div className="zp-sidebar-promo">
      <p className="zp-sidebar-promo__title">{props.title}</p>
      <p className="zp-sidebar-promo__body">{props.body}</p>
      <a className="zp-sidebar-promo__cta" href={ctaHref}>
        {props.ctaText}
      </a>
    </div>
  )
}
