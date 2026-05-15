import React, { useCallback, useEffect, useState } from 'react'
import { match } from 'ts-pattern'

import './sidebar-toggle.css'

const STORAGE_KEY = 'zpress-sidebar-collapsed'
const HTML_ATTR = 'zpSidebarCollapsed'

/**
 * SidebarToggle — small icon button in the topbar to collapse/expand the
 * docs sidebar on desktop. State persists in localStorage and is applied
 * via `html[data-zp-sidebar-collapsed='true']` for CSS targeting.
 *
 * @returns React element.
 */
export function SidebarToggle(): React.ReactElement {
  const [collapsed, setCollapsed] = useState(() => readCollapsed())

  useEffect(() => {
    applyState(collapsed)
  }, [collapsed])

  const handleClick = useCallback(() => {
    // Below the mobile breakpoint, defer to Rspress's slide-over mobile
    // menu (its hamburger handler is preserved — we just hide its visual).
    const isMobile = globalThis.window !== undefined && globalThis.innerWidth < 960
    if (isMobile) {
      const rspressBurger = globalThis.document.querySelector(
        '.rp-nav-hamburger'
      ) as HTMLButtonElement | null
      if (rspressBurger !== null) {
        rspressBurger.click()
        return
      }
    }
    setCollapsed((prev) => {
      const next = !prev
      writeCollapsed(next)
      return next
    })
  }, [])

  const label = match(collapsed)
    .with(true, () => 'Show sidebar')
    .otherwise(() => 'Hide sidebar')

  return (
    <button
      className="zp-sidebar-toggle"
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read the persisted collapsed state from localStorage.
 *
 * @private
 * @returns true when the sidebar is collapsed.
 */
function readCollapsed(): boolean {
  if (globalThis.window === undefined) {
    return false
  }
  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Persist the collapsed state to localStorage.
 *
 * @private
 * @param collapsed - true when the sidebar is collapsed.
 */
function writeCollapsed(collapsed: boolean): void {
  if (globalThis.window === undefined) {
    return
  }
  try {
    if (collapsed) {
      globalThis.localStorage.setItem(STORAGE_KEY, '1')
    } else {
      globalThis.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore — storage may be unavailable
  }
}

/**
 * Apply the collapsed state to the html dataset for CSS targeting.
 *
 * @private
 * @param collapsed - true when the sidebar is collapsed.
 */
function applyState(collapsed: boolean): void {
  if (globalThis.document === undefined) {
    return
  }
  const html = globalThis.document.documentElement
  match(collapsed)
    .with(true, () => {
      html.dataset[HTML_ATTR] = 'true'
    })
    .otherwise(() => {
      delete html.dataset[HTML_ATTR]
    })
}
