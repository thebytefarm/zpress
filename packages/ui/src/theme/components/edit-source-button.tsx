import { match } from 'massaman/match'
import type React from 'react'
import { useEffect, useRef } from 'react'

declare const __ZPRESS_VSCODE__: boolean

/**
 * "Edit" button injected next to the Rspress "Copy Markdown" LLMs button.
 *
 * Uses DOM injection to place the button inside the `.rp-llms-container`
 * that Rspress renders on every doc page. Re-injects on SPA navigation
 * by observing `<title>` mutations (same technique as vscode-nav.js).
 *
 * Posts a `zpress:edit` message to the parent VS Code webview,
 * which resolves the URL path to the source markdown file and
 * opens it in the editor.
 *
 * Registered as a globalUIComponent — renders on every page.
 *
 * @returns Null element (side-effect only component)
 */
export default function EditSourceButton(): React.ReactElement | null {
  return match(__ZPRESS_VSCODE__)
    .with(true, () => <EditSourceButtonInner />)
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Inner component that performs DOM injection. Only mounted in VS Code mode.
 *
 * @private
 * @returns Null element (side-effect only)
 */
function EditSourceButtonInner(): React.ReactElement | null {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    function inject(): void {
      /* Remove previous button if it exists (SPA navigation) */
      if (buttonRef.current) {
        buttonRef.current.remove()
        buttonRef.current = null
      }

      const container = document.querySelector('.rp-llms-container')
      if (!container) {
        return
      }

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'zp-edit-source-btn'
      btn.setAttribute('aria-label', 'Edit source file')
      btn.title = 'Open in editor'
      btn.innerHTML = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
        '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
        '<path d="m15 5 4 4"/>',
        '</svg>',
        '<span>Edit</span>',
      ].join('')

      btn.addEventListener('click', () => {
        globalThis.parent.postMessage(
          { type: 'zpress:edit', path: globalThis.location.pathname },
          '*'
        )
      })

      // oxlint-disable-next-line prefer-modern-dom-apis -- container.firstChild may be null; insertBefore(x, null) appends safely, but firstChild.before() would throw
      container.insertBefore(btn, container.firstChild)
      buttonRef.current = btn
    }

    inject()

    /* Re-inject on SPA navigation (title change = route change) */
    const titleEl = document.querySelector('title')
    const observer = match(titleEl)
      .with(null, () => null)
      .otherwise((el) => {
        const obs = new MutationObserver(inject)
        obs.observe(el, { childList: true })
        return obs
      })

    return () => {
      if (observer) {
        observer.disconnect()
      }
      if (buttonRef.current) {
        buttonRef.current.remove()
        buttonRef.current = null
      }
    }
  }, [])

  return null
}
