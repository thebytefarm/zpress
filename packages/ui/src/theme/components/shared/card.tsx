import { Link } from '@rspress/core/runtime'
import { match, P } from 'massaman/match'
import type React from 'react'

import { safeUrl } from '../../lib/safe-url.ts'

export interface CardProps {
  readonly href?: string
  readonly className?: string
  readonly children: React.ReactNode
}

/**
 * Shared base card handling link-vs-div rendering.
 *
 * Renders `<a>` with `zp-card--clickable` when `href` is provided AND
 * passes `safeUrl()` validation. When `href` is omitted or fails
 * validation, falls back to a plain `<div>` so the card surface stays
 * visible without becoming a script-execution sink.
 *
 * @param props - Props with optional href, optional className, and children
 * @returns React element rendered as an anchor or div
 */
export function Card({ href, className, children }: CardProps): React.ReactElement {
  const safeHref = match(href)
    .with(P.nullish, () => null)
    .otherwise((h) => safeUrl(h))
  return match(safeHref)
    .with(P.nonNullable, (h) => (
      <Link className={`zp-card zp-card--clickable ${className ?? ''}`} to={h}>
        {children}
      </Link>
    ))
    .otherwise(() => <div className={`zp-card ${className ?? ''}`}>{children}</div>)
}
