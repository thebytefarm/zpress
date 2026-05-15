import React, { useCallback, useState } from 'react'
import { match } from 'ts-pattern'

import './feedback.css'

export interface FeedbackProps {
  /**
   * Question shown to the reader. Defaults to "Was this page helpful?".
   */
  readonly question?: string
  /**
   * Optional callback invoked with the user's answer.
   */
  readonly onSubmit?: (answer: 'yes' | 'no') => void
}

type FeedbackState = 'idle' | 'yes' | 'no'

/**
 * Feedback — yes/no widget rendered at the bottom of doc pages.
 * Submitting hides the buttons and shows a thank-you message.
 *
 * @param props - Feedback configuration.
 * @returns React element.
 */
export function Feedback(props: FeedbackProps): React.ReactElement {
  const { question = 'Was this page helpful?', onSubmit } = props
  const [state, setState] = useState<FeedbackState>('idle')

  const handleClick = useCallback(
    (answer: 'yes' | 'no') => () => {
      setState(answer)
      match(onSubmit)
        .with(undefined, () => {})
        .otherwise((fn) => {
          fn(answer)
        })
    },
    [onSubmit]
  )

  return (
    <div className="zp-feedback">
      {match(state)
        .with('idle', () => (
          <>
            <span className="zp-feedback__q">{question}</span>
            <div className="zp-feedback__actions">
              <button className="zp-feedback__btn" type="button" onClick={handleClick('yes')}>
                <ThumbIcon />
                Yes
              </button>
              <button className="zp-feedback__btn" type="button" onClick={handleClick('no')}>
                <ThumbIcon flipped />
                No
              </button>
            </div>
          </>
        ))
        .otherwise(() => (
          <span className="zp-feedback__thanks">Thanks for the feedback.</span>
        ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface ThumbIconProps {
  readonly flipped?: boolean
}

/**
 * Thumb icon used in feedback buttons.
 *
 * @private
 * @param props - Whether to flip the icon (for thumbs-down).
 * @returns SVG element.
 */
function ThumbIcon(props: ThumbIconProps): React.ReactElement {
  const transform = match(props.flipped === true)
    .with(true, () => 'rotate(180deg)')
    .otherwise(() => 'none')

  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform }}
    >
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
}
