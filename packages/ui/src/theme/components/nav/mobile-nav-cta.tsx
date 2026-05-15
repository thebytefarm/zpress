import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { TopbarCTA } from './topbar-cta'

export interface MobileNavCTAProps {
  /**
   * CTA button text.
   */
  readonly text: string
  /**
   * CTA destination href.
   */
  readonly href: string
}

const HOST_ATTR = 'data-zp-mobile-nav-cta-host'

/**
 * MobileNavCTA — portals a primary CTA button into Rspress's mobile
 * nav-screen (`.rp-nav-screen__container`) so users can still reach
 * the get-started action when the topbar CTA is hidden on narrow
 * viewports. Inserts the CTA right before the trailing social-links
 * block so the existing dividers wrap it naturally.
 *
 * Watches DOM mutations because Rspress mounts the nav-screen
 * lazily on first hamburger click and re-mounts on route changes.
 *
 * @param props - CTA configuration.
 * @returns React element.
 */
export function MobileNavCTA(props: MobileNavCTAProps): React.ReactElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    function ensureHost(): HTMLElement | null {
      const container = globalThis.document.querySelector(
        '.rp-nav-screen__container'
      ) as HTMLElement | null
      if (container === null) {
        return null
      }
      const existing = container.querySelector(`[${HOST_ATTR}]`) as HTMLElement | null
      if (existing !== null) {
        return existing
      }
      const node = globalThis.document.createElement('div')
      node.setAttribute(HOST_ATTR, '')
      node.className = 'zp-mobile-nav-cta'
      const socials = container.querySelector('.rp-social-links')
      if (socials === null) {
        container.append(node)
      } else {
        socials.before(node)
      }
      return node
    }

    setHost(ensureHost())

    const observer = new globalThis.MutationObserver(() => {
      const next = ensureHost()
      setHost((prev) => {
        if (prev !== null && prev.isConnected) {
          return prev
        }
        return next
      })
    })
    observer.observe(globalThis.document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [])

  if (host === null) {
    return null
  }
  return createPortal(<TopbarCTA text={props.text} href={props.href} />, host)
}
