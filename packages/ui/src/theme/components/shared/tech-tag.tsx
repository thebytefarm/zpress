import { match, P } from 'massaman/match'
import type React from 'react'

import { TECH_ICONS } from '../../icons/index.ts'
import { Icon } from './icon'

export interface TechTagProps {
  readonly name: string
}

/**
 * Technology tag — resolves a tech name to icon + label using the tech map.
 * Falls back to raw name string if not in map.
 *
 * @param props - Props with the technology name to resolve
 * @returns React element with icon and label, or the raw name as fallback
 */
export function TechTag({ name }: TechTagProps): React.ReactElement {
  const entry = (TECH_ICONS as Record<string, { readonly icon: string; readonly label: string }>)[
    name
  ]

  return match(entry)
    .with(P.nonNullable, (e) => (
      <span className="zp-tag">
        <Icon icon={e.icon} />
        {` ${e.label}`}
      </span>
    ))
    .otherwise(() => <span className="zp-tag">{name}</span>)
}
