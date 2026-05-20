import { match } from 'massaman/match'
import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

import './split.css'

export interface SplitAction {
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

export interface SplitProps {
  /**
   * Eyebrow label rendered above the headline.
   */
  readonly eyebrow?: string
  /**
   * Section headline.
   */
  readonly title: React.ReactNode
  /**
   * Lead paragraph below the headline.
   */
  readonly body?: React.ReactNode
  /**
   * Optional checkmark bullets rendered under the body.
   */
  readonly bullets?: readonly string[]
  /**
   * Optional CTA action.
   */
  readonly action?: SplitAction
  /**
   * Right-side content — typically a code preview or screenshot.
   */
  readonly visual: React.ReactNode
}

/**
 * HomeSplit — two-column "show and tell" section. Copy + checkmarks on the
 * left, code/screenshot on the right. Mirrors the mockup landing.
 *
 * @param props - Split section configuration.
 * @returns React element.
 */
export function HomeSplit(props: SplitProps): React.ReactElement {
  const { eyebrow, title, body, bullets, action, visual } = props
  const list = bullets ?? []

  return (
    <section className="zp-split">
      <div className="zp-split__inner">
        <div className="zp-split__copy">
          {match(eyebrow)
            .with(undefined, () => null)
            .otherwise((e) => (
              <div className="zp-split__eyebrow">{e}</div>
            ))}
          <h2 className="zp-split__title">{title}</h2>
          {match(body)
            .with(undefined, () => null)
            .otherwise((b) => (
              <p className="zp-split__body">{b}</p>
            ))}
          {match(list.length === 0)
            .with(true, () => null)
            .otherwise(() => (
              <ul className="zp-split__bullets">
                {list.map((bullet) => (
                  <li key={bullet}>
                    <span className="zp-split__check">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ))}
          {match(action)
            .with(undefined, () => null)
            .otherwise((a) => {
              const href = safeUrl(a.link)
              if (href === null) {
                return null
              }
              return (
                <a className={btnClass(a.theme)} href={href}>
                  {a.text}
                </a>
              )
            })}
        </div>
        <div className="zp-split__visual">{visual}</div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build the CSS class for a split action button.
 *
 * @private
 * @param theme - Action theme.
 * @returns CSS class name string.
 */
function btnClass(theme: 'brand' | 'alt' | undefined): string {
  return match(theme ?? 'brand')
    .with('brand', () => 'zp-split__btn zp-split__btn--primary')
    .otherwise(() => 'zp-split__btn')
}
