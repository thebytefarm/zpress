import type React from 'react'

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
 * @param props - Promo card configuration.
 * @returns React element.
 */
export function SidebarPromo(props: SidebarPromoProps): React.ReactElement {
  return (
    <div className="zp-sidebar-promo">
      <p className="zp-sidebar-promo__title">{props.title}</p>
      <p className="zp-sidebar-promo__body">{props.body}</p>
      <a className="zp-sidebar-promo__cta" href={props.ctaHref}>
        {props.ctaText}
      </a>
    </div>
  )
}
