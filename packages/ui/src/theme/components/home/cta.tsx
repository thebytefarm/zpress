import type React from 'react'
import { match } from 'ts-pattern'

import { safeUrl } from '../../lib/safe-url.ts'
import type { HeroAction } from './hero'

import './cta.css'

export interface CTAProps {
  /**
   * Headline.
   */
  readonly title: React.ReactNode
  /**
   * Optional sub-text.
   */
  readonly subtitle?: React.ReactNode
  /**
   * Up to two CTAs.
   */
  readonly actions?: readonly HeroAction[]
}

/**
 * CTA — final call-to-action band with a soft radial accent glow.
 * Designed to sit just above the footer in the page rail.
 *
 * @param props - CTA configuration.
 * @returns React element.
 */
export function CTA(props: CTAProps): React.ReactElement {
  const { title, subtitle, actions } = props
  const list = actions ?? []

  return (
    <section className="zp-cta">
      <div className="zp-cta__inner">
        <h2 className="zp-cta__title">{title}</h2>
        {match(subtitle)
          .with(undefined, () => null)
          .otherwise((s) => (
            <p className="zp-cta__sub">{s}</p>
          ))}
        {match(list.length === 0)
          .with(true, () => null)
          .otherwise(() => (
            <div className="zp-cta__row">{list.map(renderAction)}</div>
          ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a single CTA action.
 *
 * @private
 * @param action - CTA action.
 * @param index - Array index for key generation.
 * @returns Anchor element.
 */
function renderAction(action: HeroAction, index: number): React.ReactElement | null {
  const href = safeUrl(action.link)
  if (href === null) {
    return null
  }
  const className = match(action.theme ?? 'brand')
    .with('brand', () => 'zp-cta__btn zp-cta__btn--primary')
    .otherwise(() => 'zp-cta__btn')

  return (
    <a key={`${href}:${index}`} href={href} className={className}>
      {action.text}
    </a>
  )
}
