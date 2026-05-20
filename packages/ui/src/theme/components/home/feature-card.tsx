import { match, P } from 'massaman/match'
import type React from 'react'

import './feature-card.css'
import { Card } from '../shared/card'
import { Icon } from '../shared/icon'
import { resolveCardIcon } from '../shared/resolve-card-icon'

export interface FeatureCardProps {
  readonly title: string
  readonly description: string
  readonly href?: string
  readonly icon?: string | { readonly id: string; readonly color: string }
  readonly span?: 2 | 3 | 4 | 6
  readonly titleLines?: number
  readonly descriptionLines?: number
}

/**
 * Frontmatter-shaped data for consumers to map from.
 */
export interface FeatureItem {
  readonly title: string
  readonly details: string
  readonly link?: string
  readonly icon?: string | { readonly id: string; readonly color: string }
  readonly span?: 2 | 3 | 4 | 6
}

/**
 * Feature card for landing pages — matches the workspace/section card design.
 * Renders as `<a>` when `href` is provided, `<div>` otherwise.
 *
 * @param props - Feature card props including title, description, href, icon, span, titleLines, descriptionLines
 * @returns React element with feature card layout
 */
export function FeatureCard({
  title,
  description,
  href,
  icon,
  span = 4,
  titleLines,
  descriptionLines,
}: FeatureCardProps): React.ReactElement {
  const resolved = resolveCardIcon(icon)

  const iconEl = match(resolved)
    .with(P.nonNullable, (r) => (
      <span className={`zp-card__icon zp-card__icon--${r.color}`}>
        <Icon icon={r.id} />
      </span>
    ))
    .otherwise(() => null)

  const linkTail = match(href)
    .with(P.nonNullable, () => <span className="zp-feature-card__link">Learn more →</span>)
    .otherwise(() => null)

  return (
    <div className={`zp-feature-grid__item zp-feature-grid__item--span-${span}`}>
      <div className="zp-feature-grid__item-wrap">
        <Card href={href} className="zp-feature-card">
          <div className="zp-feature-card__header">
            {iconEl}
            <span
              className={clampClass('zp-feature-card__title', titleLines)}
              style={clampStyle(titleLines)}
            >
              {title}
            </span>
          </div>
          <span
            className={clampClass('zp-feature-card__desc', descriptionLines)}
            style={clampStyle(descriptionLines)}
          >
            {description}
          </span>
          {linkTail}
        </Card>
      </div>
    </div>
  )
}

interface FeatureGridProps {
  readonly children: React.ReactNode
}

/**
 * Flex-wrap layout container for feature cards.
 *
 * @param props - Props with children to render inside the grid
 * @returns React element wrapping children in a feature grid
 */
export function FeatureGrid({ children }: FeatureGridProps): React.ReactElement {
  return (
    <div className="zp-feature-section">
      <div className="zp-feature-grid">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a className string with optional `zp-clamp` suffix.
 *
 * @private
 * @param base - Base CSS class name
 * @param lines - Optional line clamp value
 * @returns Class string with or without zp-clamp
 */
function clampClass(base: string, lines: number | undefined): string {
  if (lines) {
    return `${base} zp-clamp`
  }
  return base
}

/**
 * Build an inline style object for line clamping.
 *
 * @private
 * @param lines - Optional line clamp value
 * @returns Style object with WebkitLineClamp or undefined
 */
function clampStyle(lines: number | undefined): React.CSSProperties | undefined {
  if (lines) {
    return { WebkitLineClamp: lines }
  }
  return undefined
}
