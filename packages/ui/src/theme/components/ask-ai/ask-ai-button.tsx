import React, { useCallback } from 'react'
import { match } from 'ts-pattern'

import './ask-ai-button.css'

export interface AskAIButtonProps {
  /**
   * Click handler. When omitted, the button does nothing.
   */
  readonly onClick?: () => void
  /**
   * Visible label. Defaults to "Ask AI".
   */
  readonly label?: string
  /**
   * Optional shortcut hint (e.g. "⌘J").
   */
  readonly shortcut?: string
  /**
   * Pre-positioned glyph for the badge (default: ★).
   */
  readonly badge?: React.ReactNode
}

/**
 * AskAIButton — floating CTA pill anchored bottom-right of the viewport.
 * Visual sibling of the page chrome; pairs with AI-search integrations.
 *
 * @param props - AskAIButton configuration.
 * @returns React element.
 */
export function AskAIButton(props: AskAIButtonProps): React.ReactElement {
  const { onClick, label = 'Ask AI', shortcut, badge = '★' } = props

  const handleClick = useCallback(() => {
    match(onClick)
      .with(undefined, () => {})
      .otherwise((fn) => {
        fn()
        return
      })
  }, [onClick])

  return (
    <button className="zp-ask-ai" type="button" onClick={handleClick} aria-label={label}>
      <span className="zp-ask-ai__icon" aria-hidden="true">
        {badge}
      </span>
      <span className="zp-ask-ai__label">{label}</span>
      {match(shortcut)
        .with(undefined, () => null)
        .otherwise((s) => (
          <span className="zp-ask-ai__shortcut">{s}</span>
        ))}
    </button>
  )
}
