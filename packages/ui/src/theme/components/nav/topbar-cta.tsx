import type React from 'react'

import './topbar-cta.css'

export interface TopbarCTAProps {
  /**
   * Button label.
   */
  readonly text: string
  /**
   * Destination URL.
   */
  readonly href: string
}

/**
 * TopbarCTA — mint primary pill rendered at the right end of the topbar
 * to drive the headline conversion (e.g. "Get started →").
 *
 * @param props - Button configuration.
 * @returns React element.
 */
export function TopbarCTA(props: TopbarCTAProps): React.ReactElement {
  return (
    <a className="zp-topbar-cta" href={props.href}>
      {props.text}
    </a>
  )
}
