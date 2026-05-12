import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import './version-chip.css'

export interface VersionChipProps {
  /**
   * Version label, e.g. "v0.5".
   */
  readonly version: string
}

/**
 * VersionChip — small mono label rendered next to the topbar brand to
 * advertise the active package version. Renders a thin vertical divider
 * before the version text so it visually attaches to the brand:
 * `zpress | v0.5`.
 *
 * Portals into `.rp-nav__title` so the chip sits directly beside the
 * Rspress logo/title rather than in the nav-menu area. Falls back to
 * inline rendering when the title node is not yet mounted.
 *
 * @param props - Version chip configuration.
 * @returns React element.
 */
export function VersionChip(props: VersionChipProps): React.ReactElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = globalThis.document.querySelector('.rp-nav__title') as HTMLElement | null
    setTarget(el)
  }, [])

  const chip = (
    <span className="zp-version-chip">
      <span className="zp-version-chip__divider" aria-hidden="true" />
      <span className="zp-version-chip__text">{props.version}</span>
    </span>
  )

  if (target === null) return null
  return createPortal(chip, target)
}
