import { match, P } from 'massaman/match'
import type React from 'react'

import { LockIcon } from './icons'

export interface SecurityBadgesProps {
  /**
   * Security requirement objects from the OpenAPI operation.
   * Each entry is an alternative (OR); schemes within an entry are combined (AND).
   */
  readonly securities: readonly Record<string, unknown>[]
}

/**
 * Renders badges for each security requirement of an operation.
 *
 * Each requirement is an alternative (OR). Schemes within a single
 * requirement are combined (AND). OAuth scopes are shown in parentheses.
 *
 * @param props - Security badges props
 * @returns React element or null if no securities
 */
export function SecurityBadges({ securities }: SecurityBadgesProps): React.ReactElement | null {
  return match(securities)
    .with(
      P.when((s): s is readonly Record<string, unknown>[] => s.length > 0),
      (s) => (
        <div className="zp-oas-security">
          <div className="zp-oas-security__title">Authentication</div>
          <div className="zp-oas-security__list">
            {s.map((requirement, idx) => (
              <span key={String(idx)} className="zp-oas-security__badge">
                <LockIcon />
                {formatSchemes(requirement)}
              </span>
            ))}
          </div>
        </div>
      )
    )
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Format security scheme names with optional OAuth scopes.
 *
 * @private
 * @param requirement - Security requirement object
 * @returns Formatted scheme string with AND-combined names
 */
function formatSchemes(requirement: Record<string, unknown>): string {
  return Object.entries(requirement)
    .map(([name, scopes]) => {
      const scopeSuffix = match(scopes)
        .with(
          P.when((s): s is readonly string[] => Array.isArray(s) && s.length > 0),
          (s) => ` (${s.join(', ')})`
        )
        .otherwise(() => '')
      return `${name}${scopeSuffix}`
    })
    .join(' + ')
}
