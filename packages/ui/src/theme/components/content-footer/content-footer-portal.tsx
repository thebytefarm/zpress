import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export interface ContentFooterPortalProps {
  /**
   * Children to portal into the in-rail doc footer slot.
   */
  readonly children: React.ReactNode
}

const HOST_ATTR = 'data-zp-content-footer-host'

/**
 * ContentFooterPortal — portals its children into Rspress's `.rp-doc-footer`
 * so the content lives INSIDE the doc rail (at the reading width) rather
 * than at body level (where the `afterDoc` slot otherwise lands).
 *
 * Inserts a sentinel div as the FIRST child of `.rp-doc-footer` so the
 * portalled content appears above Rspress's built-in `.rp-prev-next-page`
 * pager. Watches DOM mutations so the portal re-attaches on client-side
 * route changes (Rspress re-renders the doc-footer per page).
 *
 * @param props - Portal configuration.
 * @returns React element.
 */
export function ContentFooterPortal(props: ContentFooterPortalProps): React.ReactElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    function ensureHost(): HTMLElement | null {
      const docFooter = globalThis.document.querySelector('.rp-doc-footer')
      if (docFooter === null) {
        return null
      }
      const existing = docFooter.querySelector(`[${HOST_ATTR}]`) as HTMLElement | null
      if (existing !== null) {
        return existing
      }
      const node = globalThis.document.createElement('div')
      node.setAttribute(HOST_ATTR, '')
      const first = docFooter.firstChild
      if (first === null) {
        docFooter.append(node)
      } else {
        first.before(node)
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
  return createPortal(<div className="zp-content-footer">{props.children}</div>, host)
}
