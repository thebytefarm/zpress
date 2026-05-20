import { match, P } from 'massaman/match'
import React from 'react'

export interface FrameProps {
  /**
   * Caption text displayed below the content.
   * Rendered as-is (MDX children handle markdown processing).
   */
  readonly caption?: string
  /**
   * Hint text displayed above the content.
   */
  readonly hint?: string
  /**
   * Image, video, or other visual content to frame.
   */
  readonly children: React.ReactNode
}

/**
 * Media wrapper that adds consistent border styling, optional caption,
 * and hint text to images and videos.
 *
 * When a video child has `autoPlay`, the Frame automatically injects
 * `playsInline`, `loop`, and `muted` attributes.
 *
 * @param props - Frame configuration with optional caption and hint
 * @returns React element with semantic figure/figcaption markup
 */
export function Frame({ caption, hint, children }: FrameProps): React.ReactElement {
  const hintEl = match(hint)
    .with(P.nonNullable, (h) => <span className="zp-frame__hint">{h}</span>)
    .otherwise(() => null)

  const captionEl = match(caption)
    .with(P.nonNullable, (c) => <figcaption className="zp-frame__caption">{c}</figcaption>)
    .otherwise(() => null)

  const enhancedChildren = React.Children.map(children, enhanceVideoChild)

  return (
    <figure className="zp-frame">
      {hintEl}
      <div className="zp-frame__content">{enhancedChildren}</div>
      {captionEl}
    </figure>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Clone video elements with autoPlay to inject playsInline, loop, and muted.
 *
 * @private
 * @param child - React child element
 * @returns Original child or enhanced video clone
 */
function enhanceVideoChild(child: React.ReactNode): React.ReactNode {
  if (!React.isValidElement(child)) {
    return child
  }

  const props = child.props as Record<string, unknown>

  if (child.type === 'video' && props['autoPlay'] === true) {
    return React.cloneElement(
      child as React.ReactElement<React.VideoHTMLAttributes<HTMLVideoElement>>,
      {
        playsInline: true,
        loop: true,
        muted: true,
      }
    )
  }

  return child
}
