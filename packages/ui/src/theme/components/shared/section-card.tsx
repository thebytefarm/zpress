import { match, P } from 'massaman/match'
import type React from 'react'

import { Card } from './card'
import { Icon } from './icon'
import { resolveCardIcon } from './resolve-card-icon'

export interface SectionCardProps {
  readonly href: string
  readonly title: string
  readonly description?: string
  readonly icon?: string | { readonly id: string; readonly color: string }
}

/**
 * Section card — simple icon + title + description link card
 * used on auto-generated section landing pages.
 *
 * @param props - Props with href, title, optional description and icon
 * @returns React element with a linked section card
 */
export function SectionCard({
  href,
  title,
  description,
  icon = 'pixelarticons:file',
}: SectionCardProps): React.ReactElement {
  const resolved = resolveCardIcon(icon) ?? { id: 'pixelarticons:file', color: 'purple' }
  const descEl = match(description)
    .with(P.nonNullable, (d) => <span className="zp-section-card__desc">{d}</span>)
    .otherwise(() => null)

  return (
    <Card href={href} className="zp-section-card">
      <div className="zp-section-card__header">
        <span className={`zp-section-card__icon zp-section-card__icon--${resolved.color}`}>
          <Icon icon={resolved.id} />
        </span>
        <span className="zp-section-card__title">{title}</span>
      </div>
      {descEl}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------
