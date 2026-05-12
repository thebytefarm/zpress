import React from 'react'
import { match } from 'ts-pattern'

import './meta-actions.css'

export interface MetaAction {
  readonly href: string
  readonly label: string
  readonly icon?: React.ReactNode
}

export interface MetaActionsProps {
  /**
   * List of actions to render — typically Edit on GitHub, Report issue, Discuss.
   */
  readonly actions: readonly MetaAction[]
}

/**
 * MetaActions — horizontal row of mono-styled links rendered below the
 * feedback widget on doc pages. Each action is an external/internal link
 * with an optional leading icon.
 *
 * @param props - Actions to render.
 * @returns React element, or null when no actions are provided.
 */
export function MetaActions(props: MetaActionsProps): React.ReactElement | null {
  return match(props.actions.length === 0)
    .with(true, () => null)
    .otherwise(() => (
      <div className="zp-meta-actions">
        {props.actions.map((action) => (
          <a
            key={`${action.label}:${action.href}`}
            className="zp-meta-actions__item"
            href={action.href}
          >
            {match(action.icon)
              .with(undefined, () => null)
              .otherwise((icon) => (
                <span className="zp-meta-actions__icon">{icon}</span>
              ))}
            <span>{action.label}</span>
          </a>
        ))}
      </div>
    ))
}
