import { match } from 'massaman/match'
import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

import './hero.css'

export interface HeroAction {
  /**
   * Visible label.
   */
  readonly text: string
  /**
   * Destination URL.
   */
  readonly link: string
  /**
   * Visual style — `brand` is the filled primary, `alt` is the outline.
   */
  readonly theme?: 'brand' | 'alt'
}

export interface HeroProps {
  /**
   * Optional eyebrow chip (e.g. "★ 2.1k stars · v0.4.2").
   */
  readonly eyebrow?: React.ReactNode
  /**
   * Main heading. Wrap a fragment in `<span className="zp-hero__grad">…</span>`
   * for the gradient phrase.
   */
  readonly title: React.ReactNode
  /**
   * Sub-text shown below the headline.
   */
  readonly tagline?: React.ReactNode
  /**
   * Two CTAs at most for visual balance.
   */
  readonly actions?: readonly HeroAction[]
  /**
   * Optional visual block beneath the CTAs (terminal demo, screenshot, etc).
   */
  readonly demo?: React.ReactNode
}

/**
 * Hero — landing-page hero with eyebrow chip, gradient-friendly headline,
 * tagline, CTAs, and an optional demo slot. The radial accent glow + dotted
 * grid backdrop are baked in via CSS and adapt to the active theme.
 *
 * @param props - Hero configuration.
 * @returns React element.
 */
export function Hero(props: HeroProps): React.ReactElement {
  const { eyebrow, title, tagline, actions, demo } = props
  const list = actions ?? []

  return (
    <section className="zp-hero">
      <div className="zp-hero__inner">
        {match(eyebrow)
          .with(undefined, () => null)
          .otherwise((e) => (
            <div className="zp-hero__eyebrow">{e}</div>
          ))}
        <h1 className="zp-hero__title">{title}</h1>
        {match(tagline)
          .with(undefined, () => null)
          .otherwise((t) => (
            <p className="zp-hero__tagline">{t}</p>
          ))}
        {match(list.length === 0)
          .with(true, () => null)
          .otherwise(() => (
            <div className="zp-hero__cta">{list.map(renderAction)}</div>
          ))}
        {match(demo)
          .with(undefined, () => null)
          .otherwise((d) => (
            <div className="zp-hero__demo">{d}</div>
          ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a single hero CTA action.
 *
 * @private
 * @param action - Hero action.
 * @param index - Array index for key generation.
 * @returns Anchor element.
 */
function renderAction(action: HeroAction, index: number): React.ReactElement | null {
  const href = safeUrl(action.link)
  if (href === null) {
    return null
  }
  const className = match(action.theme ?? 'brand')
    .with('brand', () => 'zp-hero__btn zp-hero__btn--primary')
    .otherwise(() => 'zp-hero__btn')

  return (
    <a key={`${href}:${index}`} href={href} className={className}>
      {action.text}
    </a>
  )
}
