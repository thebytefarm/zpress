import { match, P } from 'massaman/match'
import type React from 'react'

export type BadgeVariant = 'info' | 'success' | 'warning' | 'error'

export interface BadgeProps {
  /**
   * Semantic variant controlling color. Defaults to 'info'.
   * Ignored when `color` is provided.
   */
  readonly variant?: BadgeVariant
  /**
   * Custom color (hex, rgb, hsl). Overrides `variant` when set.
   * Used as the text color with a 12% opacity background tint.
   */
  readonly color?: string
  /**
   * Badge label text.
   */
  readonly children: React.ReactNode
}

/**
 * Inline badge for labeling features, endpoints, or sections.
 * Supports semantic variants (info, success, warning, error) and
 * arbitrary custom colors.
 *
 * @param props - Badge variant or custom color and label content
 * @returns React element with styled inline badge
 */
export function Badge({ variant = 'info', color, children }: BadgeProps): React.ReactElement {
  return match(color)
    .with(P.nonNullable, (c) => (
      <span className="zp-badge" style={{ color: c, backgroundColor: hexToTint(c) }}>
        {children}
      </span>
    ))
    .otherwise(() => {
      const className = match(variant)
        .with('info', () => 'zp-badge zp-badge--info')
        .with('success', () => 'zp-badge zp-badge--success')
        .with('warning', () => 'zp-badge zp-badge--warning')
        .with('error', () => 'zp-badge zp-badge--error')
        .exhaustive()

      return <span className={className}>{children}</span>
    })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Convert a hex color to an rgba tint at 12% opacity for the badge background.
 * Falls back to a simple rgba wrapper for non-hex values.
 *
 * @private
 * @param color - CSS color value
 * @returns rgba string at 12% opacity
 */
function hexToTint(color: string): string {
  const hex = color.replaceAll('#', '')

  if (hex.length !== 6 && hex.length !== 3) {
    return `color-mix(in srgb, ${color} 12%, transparent)`
  }

  const fullHex = match(hex.length)
    .with(3, () => [...hex].map((c) => `${c}${c}`).join(''))
    .otherwise(() => hex)

  const r = Number.parseInt(fullHex.slice(0, 2), 16)
  const g = Number.parseInt(fullHex.slice(2, 4), 16)
  const b = Number.parseInt(fullHex.slice(4, 6), 16)

  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, 0.12)`
}
