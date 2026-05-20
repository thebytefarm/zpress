import { match } from 'massaman/match'
import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

import './page-pager.css'

export interface PagerLink {
  /**
   * Link label.
   */
  readonly title: string
  /**
   * Destination URL.
   */
  readonly href: string
}

export interface PagePagerProps {
  /**
   * Previous page link, or undefined to hide the prev side.
   */
  readonly prev?: PagerLink
  /**
   * Next page link, or undefined to hide the next side.
   */
  readonly next?: PagerLink
}

/**
 * PagePager — bottom-of-content prev/next navigation. Two side-by-side
 * bordered link cards mirroring the mockup gutter pattern.
 *
 * @param props - Pager configuration.
 * @returns React element, or null when both ends are empty.
 */
export function PagePager(props: PagePagerProps): React.ReactElement | null {
  const { prev, next } = props

  return match(prev === undefined && next === undefined)
    .with(true, () => null)
    .otherwise(() => (
      <nav className="zp-pager">
        {match(prev)
          .with(undefined, () => <span className="zp-pager__placeholder" />)
          .otherwise((p) => {
            const href = safeUrl(p.href)
            if (href === null) {
              return <span className="zp-pager__placeholder" />
            }
            return (
              <a className="zp-pager__link zp-pager__link--prev" href={href}>
                <span className="zp-pager__label">
                  <Chev direction="left" />
                  Previous
                </span>
                <span className="zp-pager__title">{p.title}</span>
              </a>
            )
          })}
        {match(next)
          .with(undefined, () => <span className="zp-pager__placeholder" />)
          .otherwise((n) => {
            const href = safeUrl(n.href)
            if (href === null) {
              return <span className="zp-pager__placeholder" />
            }
            return (
              <a className="zp-pager__link zp-pager__link--next" href={href}>
                <span className="zp-pager__label">
                  Next
                  <Chev direction="right" />
                </span>
                <span className="zp-pager__title">{n.title}</span>
              </a>
            )
          })}
      </nav>
    ))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface ChevProps {
  readonly direction: 'left' | 'right'
}

/**
 * Chevron arrow icon used inside the pager label row.
 *
 * @private
 * @param props - direction
 * @returns SVG element.
 */
function Chev(props: ChevProps): React.ReactElement {
  const points = match(props.direction)
    .with('left', () => '15 18 9 12 15 6')
    .otherwise(() => '9 18 15 12 9 6')
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points={points} />
    </svg>
  )
}
