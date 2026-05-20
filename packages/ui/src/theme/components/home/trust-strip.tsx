import { match } from 'massaman/match'
import type React from 'react'

import './trust-strip.css'

export interface TrustStripProps {
  /**
   * Lead text shown before the names. Defaults to "used by".
   */
  readonly lead?: string
  /**
   * Names to render, separated by mono dots.
   */
  readonly names: readonly string[]
}

/**
 * TrustStrip — a single-row "used by …" band with mono dots between names.
 * Renders only when at least one name is supplied.
 *
 * @param props - Trust strip configuration.
 * @returns React element, or null when no names are provided.
 */
export function TrustStrip(props: TrustStripProps): React.ReactElement | null {
  const { lead = 'used by', names } = props
  return match(names.length === 0)
    .with(true, () => null)
    .otherwise(() => (
      <section className="zp-trust">
        <div className="zp-trust__row">
          <span className="zp-trust__lead">{lead}</span>
          {names.map((name, i) => (
            <span key={`${name}:${i}`} className="zp-trust__item">
              <span className="zp-trust__name">{name}</span>
              {match(i < names.length - 1)
                .with(true, () => <span className="zp-trust__sep">·</span>)
                .otherwise(() => null)}
            </span>
          ))}
        </div>
      </section>
    ))
}
