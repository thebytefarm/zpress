import { match } from 'massaman/match'
import React, { useCallback, useEffect, useState } from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

import './announcement-bar.css'

const STORAGE_PREFIX = 'zpress-announcement-dismissed:'

export interface AnnouncementBarProps {
  /**
   * Stable ID — when present, dismissal is remembered in localStorage.
   */
  readonly id?: string
  /**
   * Lead text. Use for the highlighted phrase ("zpress 1.0", "NEW:", etc).
   */
  readonly lead?: React.ReactNode
  /**
   * Body of the announcement.
   */
  readonly children: React.ReactNode
  /**
   * Optional CTA link rendered after the message.
   */
  readonly cta?: { readonly href: string; readonly label: string }
  /**
   * Hide the dismiss button.
   */
  readonly persistent?: boolean
}

/**
 * AnnouncementBar — full-width banner rendered above the topbar via the
 * Layout `top` slot. Ships with a pulsing accent dot and an optional
 * dismiss button that persists in localStorage when an `id` is provided.
 *
 * @param props - AnnouncementBar configuration.
 * @returns React element, or null when the bar has been dismissed.
 */
export function AnnouncementBar(props: AnnouncementBarProps): React.ReactElement | null {
  const { id, lead, children, cta, persistent } = props
  const [dismissed, setDismissed] = useState(() => readDismissed(id))

  useEffect(() => {
    setDismissed(readDismissed(id))
  }, [id])

  const handleDismiss = useCallback(() => {
    writeDismissed(id)
    setDismissed(true)
  }, [id])

  return match(dismissed)
    .with(true, () => null)
    .otherwise(() => (
      <div className="zp-announce" role="region" aria-label="Announcement">
        <span className="zp-announce__pulse" aria-hidden="true" />
        <span className="zp-announce__msg">
          {match(lead)
            .with(undefined, () => null)
            .otherwise((l) => (
              <em className="zp-announce__lead">{l}</em>
            ))}{' '}
          {children}
          {match(cta)
            .with(undefined, () => null)
            .otherwise((c) => {
              const href = safeUrl(c.href)
              if (href === null) {
                return null
              }
              return (
                <a className="zp-announce__cta" href={href}>
                  {c.label} →
                </a>
              )
            })}
        </span>
        {match(persistent === true)
          .with(true, () => null)
          .otherwise(() => (
            <button
              className="zp-announce__close"
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss announcement"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
      </div>
    ))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Read the dismissed flag from localStorage.
 *
 * @private
 * @param id - Announcement ID, or undefined.
 * @returns true when the announcement has been dismissed.
 */
function readDismissed(id: string | undefined): boolean {
  return match(id)
    .with(undefined, () => false)
    .otherwise((key) => {
      if (globalThis.window === undefined) {
        return false
      }
      try {
        return globalThis.localStorage.getItem(STORAGE_PREFIX + key) === '1'
      } catch {
        return false
      }
    })
}

/**
 * Persist the dismissed flag to localStorage.
 *
 * @private
 * @param id - Announcement ID, or undefined.
 */
function writeDismissed(id: string | undefined): void {
  match(id)
    .with(undefined, () => {})
    .otherwise((key) => {
      try {
        globalThis.localStorage.setItem(STORAGE_PREFIX + key, '1')
      } catch {
        // ignore — storage may be unavailable
      }
    })
}
