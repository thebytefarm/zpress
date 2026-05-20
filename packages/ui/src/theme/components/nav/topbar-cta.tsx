import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

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
 * Renders `null` when `href` fails `safeUrl()` validation — config-driven
 * hrefs must not become script-execution sinks.
 *
 * @param props - Button configuration.
 * @returns React element, or `null` when the href fails URL validation.
 */
export function TopbarCTA(props: TopbarCTAProps): React.ReactElement | null {
  const href = safeUrl(props.href)
  if (href === null) {
    return null
  }
  return (
    <a className="zp-topbar-cta" href={href}>
      {props.text}
    </a>
  )
}
