import { match, P } from 'massaman/match'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface ColorProps {
  /**
   * Color value in any CSS-valid format (hex, rgb, hsl).
   */
  readonly value: string
  /**
   * Optional display name for the color.
   */
  readonly name?: string
}

/**
 * Color swatch that displays a color value with an optional name.
 * Click to copy the color value to clipboard.
 *
 * @param props - Color value and optional display name
 * @returns React element with clickable color swatch
 */
export function Color({ value, name }: ColorProps): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }
    },
    []
  )

  const handleClick = useCallback(() => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        if (resetTimerRef.current !== null) {
          clearTimeout(resetTimerRef.current)
        }
        setCopied(true)
        resetTimerRef.current = setTimeout(() => setCopied(false), 2000)
        return null
      })
      .catch(() => {
        setCopied(false)
      })
  }, [value])

  const nameEl = match(name)
    .with(P.nonNullable, (n) => <span className="zp-color__name">{n}</span>)
    .otherwise(() => null)

  const label = match(copied)
    .with(true, () => 'Copied!')
    .otherwise(() => value)

  return (
    <button type="button" className="zp-color" onClick={handleClick} title={`Copy ${value}`}>
      <span className="zp-color__swatch" style={{ backgroundColor: value }} />
      <span className="zp-color__info">
        {nameEl}
        <span className="zp-color__value">{label}</span>
      </span>
    </button>
  )
}
