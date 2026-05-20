import type { LogoContext, LogoFn, LogoImage, ZpressConfig } from '@zpress/config'
// oxlint-disable-next-line import/no-unresolved -- alias provided by createRspressConfig's resolve.alias
import userConfigModule from '@zpress/internal/user-config'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { match, P } from 'ts-pattern'

import { ZpressLogo } from '../shared/zpress-logo'

import './nav-logo.css'

/**
 * CSS custom property names read from `<html>` to populate `LogoContext.colors`.
 * Kept in sync with the `--rp-c-*` variables emitted by the active theme's
 * stylesheet.
 */
const COLOR_VARS = Object.freeze({
  brand: '--rp-c-brand',
  brandHover: '--rp-c-brand-dark',
  brandSoft: '--rp-c-brand-tint',
  bg: '--rp-c-bg',
  text: '--rp-c-text-1',
})

/**
 * Fallback colors used during SSR / before the first paint, where
 * `getComputedStyle` is unavailable or returns empty strings.
 */
const FALLBACK_COLORS = Object.freeze({
  brand: '#7c3aed',
  brandHover: '#6d28d9',
  brandSoft: '#ede9fe',
  bg: '#ffffff',
  text: '#1f2937',
})

/**
 * `NavLogo` — Rspress-aware logo slot that handles all three logo configs.
 *
 * - Reads `userConfig.logo` from the bundled user config via the
 *   `@zpress/internal/user-config` alias.
 * - Subscribes to `data-zp-theme` / `data-zp-variant` mutations on `<html>`
 *   so a function-form `logo` re-runs when the theme switches.
 * - Portals into Rspress's `.rp-nav__title__link` element so the rendered
 *   logo sits inside the same wrapper as Rspress's stock title/logo.
 *
 * Branching:
 * - `logo` is a `string` → Rspress already renders an `<img>` for it via
 *   its native `logo` config field; this slot renders `null`.
 * - `logo` is a function → call with the live `LogoContext`. If the return
 *   value is a `LogoImage`-shaped object, spread onto `<img>`. Otherwise
 *   render as a React node.
 * - `logo` is missing → render the default themed `<ZpressLogo />`.
 *
 * @returns Portaled logo element or null
 */
export function NavLogo(): React.ReactElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [themeContext, setThemeContext] = useState<LogoContext | null>(null)

  useEffect(() => {
    const link = globalThis.document.querySelector('.rp-nav__title__link') as HTMLElement | null
    setTarget(link)

    const html = globalThis.document.documentElement
    setThemeContext(readThemeContext(html))

    const observer = new MutationObserver(() => {
      setThemeContext(readThemeContext(html))
    })
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['data-zp-theme', 'data-zp-variant', 'class', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  const logoConfig = readLogoConfig(userConfigModule)

  // String logos are rendered by Rspress's native NavTitle — bail out so
  // we don't double-render. The slot does nothing in this case.
  const isStringLogo = typeof logoConfig === 'string'
  if (isStringLogo) {
    return null
  }

  if (target === null || themeContext === null) {
    return null
  }

  const rendered = match(logoConfig)
    .with(P.nullish, () => <ZpressLogo />)
    .otherwise((fn) => renderLogoFn({ fn, theme: themeContext }))

  return createPortal(<span className="zp-nav-logo">{rendered}</span>, target)
}

export { NavLogo as default }

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Extract the `logo` field from the bundled user config module. Tolerates
 * default-exports, named-exports, and the empty stub fallback.
 *
 * @private
 * @param mod - Module imported from `@zpress/internal/user-config`
 * @returns The `logo` value or `undefined` when none is configured
 */
function readLogoConfig(mod: unknown): string | LogoFn | undefined {
  const candidate = match(mod)
    .with({ default: P.nonNullable }, (m) => m.default as Partial<ZpressConfig>)
    .with(P.nonNullable, (m) => m as Partial<ZpressConfig>)
    .otherwise(() => ({}) as Partial<ZpressConfig>)
  const { logo } = candidate
  if (typeof logo === 'string') {
    return logo
  }
  if (typeof logo === 'function') {
    return logo
  }
  return undefined
}

interface RenderLogoFnParams {
  readonly fn: LogoFn
  readonly theme: LogoContext
}

/**
 * Invoke the user's logo function and turn its return value into a
 * renderable React node.
 *
 * `LogoImage` returns are detected structurally (object with a `src` key
 * that isn't already a React element) and spread onto an `<img>` element
 * matching Rspress's logo classes so styling stays consistent. Anything
 * else is rendered as a React node directly.
 *
 * @private
 * @param params - User function + live theme context
 * @returns React node or null
 */
function renderLogoFn(params: RenderLogoFnParams): React.ReactNode {
  const result = params.fn({ theme: params.theme })
  if (isLogoImage(result)) {
    return (
      <img
        src={result.src}
        alt={result.alt ?? 'logo'}
        width={result.width}
        height={result.height}
        className="rspress-logo rp-nav__title__logo-image"
      />
    )
  }
  return result as React.ReactNode
}

/**
 * Type guard distinguishing a `LogoImage` object from a React element.
 * React elements are objects too, but they carry a `$$typeof` symbol key —
 * any plain object with a string `src` and without `$$typeof` is treated
 * as a `LogoImage`.
 *
 * @private
 * @param value - Return value from a `LogoFn`
 * @returns True when `value` should be spread onto an `<img>` element
 */
function isLogoImage(value: unknown): value is LogoImage {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const obj = value as Record<string, unknown>
  if ('$$typeof' in obj) {
    return false
  }
  return typeof obj.src === 'string'
}

/**
 * Build the `LogoContext` passed to the user's logo function. Reads the
 * active theme name and variant from `<html>` data attributes and the
 * resolved brand colors from CSS custom properties.
 *
 * @private
 * @param html - Document root element
 * @returns Live theme context snapshot
 */
function readThemeContext(html: HTMLElement): LogoContext {
  const variant: 'light' | 'dark' = match(html.dataset.zpVariant)
    .with('light', () => 'light' as const)
    .otherwise(() => 'dark' as const)
  const name = match(html.dataset.zpTheme)
    .with(P.string, (s) => s)
    .otherwise(() => 'default')

  const styles = globalThis.window.getComputedStyle(html)
  function read(cssVar: string, fallback: string): string {
    const raw = styles.getPropertyValue(cssVar).trim()
    if (raw.length === 0) {
      return fallback
    }
    return raw
  }

  return {
    name,
    variant,
    isDark: variant === 'dark',
    colors: {
      brand: read(COLOR_VARS.brand, FALLBACK_COLORS.brand),
      brandHover: read(COLOR_VARS.brandHover, FALLBACK_COLORS.brandHover),
      brandSoft: read(COLOR_VARS.brandSoft, FALLBACK_COLORS.brandSoft),
      bg: read(COLOR_VARS.bg, FALLBACK_COLORS.bg),
      text: read(COLOR_VARS.text, FALLBACK_COLORS.text),
    },
  }
}
