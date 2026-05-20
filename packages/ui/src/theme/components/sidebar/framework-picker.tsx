import { match } from 'massaman/match'
import type React from 'react'

import { SidebarToggle } from './sidebar-toggle'

import './framework-picker.css'

export interface FrameworkPickerProps {
  /**
   * Eyebrow label above the picker. Defaults to "Framework".
   */
  readonly label?: string
  /**
   * Currently active framework name shown in the picker.
   */
  readonly current: string
  /**
   * Optional small mark / icon shown to the left of the framework name.
   */
  readonly mark?: React.ReactNode
  /**
   * Optional version chip shown next to the eyebrow label.
   */
  readonly version?: string
  /**
   * When true, render a sidebar collapse toggle in the picker header.
   */
  readonly showCollapseToggle?: boolean
}

/**
 * FrameworkPicker — top-of-sidebar selector showing the current framework
 * + an optional version chip + an optional sidebar collapse toggle.
 * Mirrors the mockup's framework switcher pattern.
 *
 * @param props - Picker configuration.
 * @returns React element.
 */
export function FrameworkPicker(props: FrameworkPickerProps): React.ReactElement {
  const { label = 'Framework', current, mark, version, showCollapseToggle } = props

  return (
    <div className="zp-fwpicker">
      <div className="zp-fwpicker__head">
        <span className="zp-fwpicker__label">{label}</span>
        <div className="zp-fwpicker__head-right">
          {match(version)
            .with(undefined, () => null)
            .otherwise((v) => (
              <span className="zp-fwpicker__version">{v}</span>
            ))}
          {match(showCollapseToggle)
            .with(true, () => <SidebarToggle />)
            .otherwise(() => null)}
        </div>
      </div>
      <div className="zp-fwpicker__control">
        {match(mark)
          .with(undefined, () => null)
          .otherwise((m) => (
            <span className="zp-fwpicker__mark">{m}</span>
          ))}
        <span className="zp-fwpicker__name">{current}</span>
        <svg
          className="zp-fwpicker__chev"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}
