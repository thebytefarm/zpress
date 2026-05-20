import { CodeBlockRuntime } from '@rspress/core/theme'
import { match, P } from 'massaman/match'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from './icon'

export type PromptAction = 'copy' | 'cursor' | 'vscode' | 'chatgpt' | 'claude'

export interface PromptProps {
  /**
   * Short description of what the prompt does.
   * Displayed as the visible summary.
   */
  readonly description?: string
  /**
   * Iconify icon ID rendered before the description.
   * Defaults to `pixelarticons:sparkles`.
   */
  readonly icon?: string
  /**
   * Action buttons to display. Defaults to `['copy']`.
   * - `copy` — copy prompt text to clipboard
   * - `cursor` — copy to clipboard and launch Cursor IDE
   * - `vscode` — copy to clipboard and launch VS Code
   * - `chatgpt` — open ChatGPT in a new tab with prompt pre-filled
   * - `claude` — open Claude in a new tab with prompt pre-filled
   */
  readonly actions?: readonly PromptAction[]
  /**
   * The raw prompt text. Rendered inside an expandable code block.
   */
  readonly children: React.ReactNode
}

/**
 * AI prompt block with description, action buttons, and an expandable
 * code view for the full prompt text.
 *
 * @param props - Prompt configuration with description, icon, and actions
 * @returns React element with prompt card
 */
export function Prompt({
  description,
  icon = 'pixelarticons:sparkles',
  actions = ['copy'],
  children,
}: PromptProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const getRawText = useCallback(
    (): string =>
      match(contentRef.current)
        .with(null, () => '')
        .otherwise((el) => el.textContent ?? ''),
    []
  )

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current)
      }
    },
    []
  )

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current)
    }
    setFeedback(msg)
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 2000)
  }, [])

  const handleAction = useCallback(
    (action: PromptAction) => {
      const text = getRawText()

      match(action)
        .with('copy', () => {
          navigator.clipboard
            .writeText(text)
            .then(() => {
              showFeedback('Copied!')
              return null
            })
            .catch(() => {
              showFeedback('Copy failed')
            })
        })
        .with('cursor', () => {
          // Copy prompt to clipboard then open Cursor so the user can paste into composer
          navigator.clipboard
            .writeText(text)
            .then(() => {
              showFeedback('Copied — opening Cursor…')
              globalThis.open('cursor://', '_self')
              return null
            })
            .catch(() => {
              showFeedback('Copy failed')
            })
        })
        .with('vscode', () => {
          // Copy prompt to clipboard then open VS Code so the user can paste
          navigator.clipboard
            .writeText(text)
            .then(() => {
              showFeedback('Copied — opening VS Code…')
              globalThis.open('vscode://', '_self')
              return null
            })
            .catch(() => {
              showFeedback('Copy failed')
            })
        })
        .with('chatgpt', () => {
          const encoded = encodeURIComponent(text)
          globalThis.open(`https://chatgpt.com/?hints=search&prompt=${encoded}`, '_blank')
          showFeedback('Opened ChatGPT')
        })
        .with('claude', () => {
          const encoded = encodeURIComponent(text)
          globalThis.open(`https://claude.ai/new?q=${encoded}`, '_blank')
          showFeedback('Opened Claude')
        })
        .exhaustive()
    },
    [getRawText, showFeedback]
  )

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  const descEl = match(description)
    .with(P.nonNullable, (d) => <span className="zp-prompt__description">{d}</span>)
    .otherwise(() => null)

  const feedbackEl = match(feedback)
    .with(P.nonNullable, (msg) => <span className="zp-prompt__feedback">{msg}</span>)
    .otherwise(() => null)

  // Split first action as primary button, rest go into dropdown
  const primaryAction = actions[0] ?? 'copy'
  const dropdownActions = actions.slice(1)

  return (
    <div className="zp-prompt">
      <div className="zp-prompt__header">
        <span className="zp-prompt__icon">
          <Icon icon={icon} />
        </span>
        {descEl}
        {feedbackEl}
        <span className="zp-prompt__actions">
          <PrimaryButton action={primaryAction} onPress={handleAction} />
          {match(dropdownActions.length > 0)
            .with(true, () => <ActionDropdown actions={dropdownActions} onPress={handleAction} />)
            .otherwise(() => null)}
          <button
            type="button"
            className="zp-prompt__btn zp-prompt__btn--icon"
            onClick={toggleExpanded}
            title={match(expanded)
              .with(true, () => 'Hide prompt')
              .otherwise(() => 'Show prompt')}
          >
            <Icon
              icon={match(expanded)
                .with(true, () => 'pixelarticons:collapse')
                .otherwise(() => 'pixelarticons:expand')}
            />
          </button>
        </span>
      </div>
      <div ref={contentRef} className="zp-prompt__raw" hidden>
        {children}
      </div>
      {match(expanded)
        .with(true, () => (
          <div className="zp-prompt__code">
            <CodeBlockRuntime lang="markdown" code={getRawText()} />
          </div>
        ))
        .otherwise(() => null)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Action metadata for display.
 *
 * @private
 */
interface ActionMeta {
  readonly label: string
  readonly icon: React.ReactNode
  readonly description: string
}

/**
 * Resolve display metadata for a prompt action.
 *
 * @private
 * @param action - The prompt action type
 * @returns Label, icon, and description for the action
 */
function actionMeta(action: PromptAction): ActionMeta {
  return match(action)
    .with('copy', () => ({
      label: 'Copy',
      icon: <Icon icon="pixelarticons:clipboard" />,
      description: 'Copy to clipboard',
    }))
    .with('cursor', () => ({
      label: 'Cursor',
      icon: <Icon icon="simple-icons:cursor" />,
      description: 'Copy and open Cursor IDE',
    }))
    .with('vscode', () => ({
      label: 'VS Code',
      icon: <Icon icon="mdi:microsoft-visual-studio-code" />,
      description: 'Copy and open VS Code',
    }))
    .with('chatgpt', () => ({
      label: 'ChatGPT',
      icon: <Icon icon="simple-icons:openai" />,
      description: 'Open in ChatGPT with prompt',
    }))
    .with('claude', () => ({
      label: 'Claude',
      icon: <Icon icon="simple-icons:claude" />,
      description: 'Open in Claude with prompt',
    }))
    .exhaustive()
}

interface PrimaryButtonProps {
  readonly action: PromptAction
  readonly onPress: (action: PromptAction) => void
}

/**
 * Full-width primary action button.
 *
 * @private
 * @param props - Action and press handler
 * @returns Button element
 */
function PrimaryButton({ action, onPress }: PrimaryButtonProps): React.ReactElement {
  const meta = actionMeta(action)
  const handleClick = useCallback(() => {
    onPress(action)
  }, [action, onPress])

  return (
    <button type="button" className="zp-prompt__btn zp-prompt__btn--primary" onClick={handleClick}>
      {meta.icon}
      <span>{meta.label}</span>
    </button>
  )
}

interface ActionDropdownProps {
  readonly actions: readonly PromptAction[]
  readonly onPress: (action: PromptAction) => void
}

/**
 * Dropdown menu for additional prompt actions.
 *
 * @private
 * @param props - Actions list and press handler
 * @returns Dropdown element with toggle and menu
 */
function ActionDropdown({ actions, onPress }: ActionDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) {
      return
    }

    function handler(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev)
  }, [])

  return (
    <div ref={ref} className="zp-prompt__dropdown">
      <button
        type="button"
        className="zp-prompt__btn zp-prompt__btn--icon"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Icon
          icon={match(open)
            .with(true, () => 'pixelarticons:chevron-up')
            .otherwise(() => 'pixelarticons:chevron-down')}
        />
      </button>
      {match(open)
        .with(true, () => (
          <div className="zp-prompt__menu" role="menu">
            {actions.map((action) => {
              const meta = actionMeta(action)
              return (
                <DropdownItem
                  key={action}
                  action={action}
                  meta={meta}
                  onPress={(a) => {
                    onPress(a)
                    setOpen(false)
                  }}
                />
              )
            })}
          </div>
        ))
        .otherwise(() => null)}
    </div>
  )
}

interface DropdownItemProps {
  readonly action: PromptAction
  readonly meta: ActionMeta
  readonly onPress: (action: PromptAction) => void
}

/**
 * A single item in the action dropdown menu.
 *
 * @private
 * @param props - Action, display metadata, and press handler
 * @returns Menu item button
 */
function DropdownItem({ action, meta, onPress }: DropdownItemProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onPress(action)
  }, [action, onPress])

  return (
    <button type="button" className="zp-prompt__menu-item" role="menuitem" onClick={handleClick}>
      <span className="zp-prompt__menu-icon">{meta.icon}</span>
      <span className="zp-prompt__menu-text">
        <span className="zp-prompt__menu-label">{meta.label}</span>
        <span className="zp-prompt__menu-desc">{meta.description}</span>
      </span>
    </button>
  )
}
