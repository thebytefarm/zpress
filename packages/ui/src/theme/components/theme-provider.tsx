import { BUILT_IN_THEMES, TOKEN_TO_CSS_VAR } from '@zpress/theme'
import type { ThemeColors, TokenPath } from '@zpress/theme'
import { useEffect, useLayoutEffect } from 'react'
import type React from 'react'
import { match, P } from 'ts-pattern'

declare const __ZPRESS_THEME_NAME__: string
declare const __ZPRESS_COLOR_MODE__: string
declare const __ZPRESS_THEME_COLORS__: string
declare const __ZPRESS_THEME_DARK_COLORS__: string

/**
 * `ThemeColors` field names whose values are applied to the DOM as
 * CSS custom-property overrides.
 */
type ThemeColorKey = keyof ThemeColors

/**
 * Supported color modes per built-in theme — used to set `data-zp-modes`
 * so the appearance toggle is hidden for single-mode themes.
 *
 * Derived from `BUILT_IN_THEMES` (the registry) so adding a theme to the
 * registry automatically wires up its mode metadata here.
 */
const THEME_MODES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(BUILT_IN_THEMES).map(([name, theme]) => [name, theme.modes.join(' ')])
  )
)

/**
 * Mapping from each `ThemeColors` field to the canonical `ZpressTokens`
 * leaf path that backs it. Fields whose only target is a legacy `--rp-*`
 * var have `null` here.
 */
const THEME_COLOR_TOKEN_PATHS: Readonly<Record<ThemeColorKey, TokenPath | null>> = Object.freeze({
  brand: 'colors.brand.primary',
  brandLight: null,
  brandDark: 'colors.brand.hover',
  brandSoft: 'colors.brand.soft',
  bg: 'colors.surface.bg',
  bgAlt: 'colors.surface.bgAlt',
  bgElv: 'colors.surface.bgElv',
  bgSoft: 'colors.surface.bgSoft',
  text1: 'colors.text.text1',
  text2: 'colors.text.text2',
  text3: 'colors.text.text3',
  divider: 'colors.border.divider',
  border: 'colors.border.border',
  homeBg: null,
})

/**
 * Legacy `--rp-*` CSS variable names still emitted alongside the
 * canonical `--zp-*` vars so Rspress's built-in styles continue to
 * pick up theme color overrides without modification.
 */
const LEGACY_RP_VARS: Readonly<Record<ThemeColorKey, readonly string[]>> = Object.freeze({
  brand: ['--rp-c-brand'],
  brandLight: ['--rp-c-brand-light'],
  brandDark: ['--rp-c-brand-dark'],
  brandSoft: ['--rp-c-brand-tint'],
  bg: ['--rp-c-bg'],
  bgAlt: [],
  bgElv: [],
  bgSoft: ['--rp-c-bg-soft'],
  text1: ['--rp-c-text-1'],
  text2: ['--rp-c-text-2'],
  text3: ['--rp-c-text-3'],
  divider: ['--rp-c-divider'],
  border: [],
  homeBg: ['--rp-home-background-bg'],
})

/**
 * Mapping from each `ThemeColors` field name to the ordered list of CSS
 * variables it sets on `<html>`. The canonical `--zp-*` var (resolved
 * from `TOKEN_TO_CSS_VAR`) is emitted first, followed by any legacy
 * `--rp-*` vars from `LEGACY_RP_VARS`.
 */
const COLOR_VAR_MAP: Readonly<Record<ThemeColorKey, readonly string[]>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(THEME_COLOR_TOKEN_PATHS) as readonly ThemeColorKey[]).map((key) => {
      const tokenPath = THEME_COLOR_TOKEN_PATHS[key]
      const legacy = LEGACY_RP_VARS[key]
      const zpVar = match(tokenPath)
        .with(P.nullish, () => [] as readonly string[])
        .otherwise((path) => [TOKEN_TO_CSS_VAR[path]] as readonly string[])
      return [key, [...zpVar, ...legacy]] as const
    })
  ) as Record<ThemeColorKey, readonly string[]>
)

/**
 * Collect all CSS variable names from the color map.
 */
const ALL_CSS_VARS: readonly string[] = Object.values(COLOR_VAR_MAP).flat()

/**
 * Minimum time (ms) the loading overlay stays visible before fading out.
 */
const LOADER_MIN_DISPLAY_MS = 150

/**
 * Duration (ms) of the CSS fade-out transition. Must match the
 * `transition: opacity` value in loader-backdrop.css / loader-dots.css.
 */
const LOADER_FADE_MS = 200

const useIsomorphicLayoutEffect = getIsomorphicEffect()

/**
 * ThemeProvider — global UI component that configures the active theme.
 *
 * Sets `data-zp-theme` attribute, forces color mode, and applies
 * inline CSS custom property overrides from build-time defines.
 * Sets `data-zp-ready` on <html> to dismiss the loading overlay
 * injected by critical CSS.
 *
 * @returns Null element (side-effect only component)
 */
export function ThemeProvider(): React.ReactElement | null {
  useIsomorphicLayoutEffect(() => {
    const html = document.documentElement
    const themeName = safeGetItem('zpress-theme') || __ZPRESS_THEME_NAME__
    const colorMode = __ZPRESS_COLOR_MODE__
    const colors = parseColors(__ZPRESS_THEME_COLORS__)
    const darkColors = parseColors(__ZPRESS_THEME_DARK_COLORS__)
    const hasColors = Object.keys(colors).length > 0
    const hasDarkColors = Object.keys(darkColors).length > 0

    // 1. Set theme attribute
    html.dataset.zpTheme = themeName

    // 2. Set supported modes — hides the appearance toggle for single-mode themes
    const modes = THEME_MODES[themeName]
    if (modes) {
      html.dataset.zpModes = modes
    } else {
      html.dataset.zpModes = 'dark light'
    }

    // 3. Force color mode if not toggle
    if (colorMode === 'dark') {
      html.classList.add('rp-dark', 'dark')
      html.dataset.dark = 'true'
      try {
        localStorage.setItem('rspress-theme-appearance', 'dark')
      } catch {
        // storage unavailable
      }
    } else if (colorMode === 'light') {
      html.classList.remove('rp-dark', 'dark')
      html.dataset.dark = 'false'
      try {
        localStorage.setItem('rspress-theme-appearance', 'light')
      } catch {
        // storage unavailable
      }
    }

    // 4. Apply base color overrides
    if (hasColors) {
      applyColorOverrides(html, colors)
    }

    // 5. Observe dark mode changes for dark-specific overrides
    if (hasDarkColors) {
      const isDark = html.classList.contains('rp-dark')
      if (isDark) {
        applyColorOverrides(html, darkColors)
      }

      const observer = new MutationObserver((mutations) => {
        const classChanged = mutations.some((m) => m.attributeName === 'class')
        if (classChanged) {
          const nowDark = html.classList.contains('rp-dark')
          clearColorOverrides(html)
          if (hasColors) {
            applyColorOverrides(html, colors)
          }
          if (nowDark && hasDarkColors) {
            applyColorOverrides(html, darkColors)
          }
        }
      })

      observer.observe(html, { attributes: true, attributeFilter: ['class'] })

      // 6. Dismiss loading overlay
      const cancelLoader = dismissLoader(html)

      return () => {
        observer.disconnect()
        cancelLoader()
      }
    }

    // 6. Dismiss loading overlay (no dark-color observer needed)
    return dismissLoader(html)
  }, [])

  return null
}

export { ThemeProvider as default }

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a flat list of [cssVar, value] pairs from a color overrides object.
 *
 * @private
 * @param colors - Color key-value overrides
 * @returns Array of CSS variable/value pairs
 */
function resolveColorPairs(colors: Record<string, string>): readonly (readonly [string, string])[] {
  return Object.entries(colors).flatMap(([key, value]) => {
    const vars = (COLOR_VAR_MAP as Record<string, readonly string[] | undefined>)[key]
    if (!Array.isArray(vars)) {
      return []
    }
    return vars.map((cssVar) => [cssVar, value] as const)
  })
}

/**
 * Apply a ThemeColors object as inline CSS custom properties on <html>.
 *
 * @private
 * @param html - HTML document element
 * @param colors - Color key-value overrides to apply
 */
function applyColorOverrides(html: HTMLElement, colors: Record<string, string>): void {
  const pairs = resolveColorPairs(colors)
  // oxlint-disable-next-line no-unused-expressions -- DOM side effect; for-loops and forEach also banned
  pairs.map(([cssVar, value]) => html.style.setProperty(cssVar, value))
}

/**
 * Remove all color overrides previously set as inline styles.
 *
 * @private
 * @param html - HTML document element
 */
function clearColorOverrides(html: HTMLElement): void {
  // oxlint-disable-next-line no-unused-expressions -- DOM side effect; for-loops and forEach also banned
  ALL_CSS_VARS.map((cssVar) => html.style.removeProperty(cssVar))
}

/**
 * Safe localStorage read — returns null if storage is unavailable.
 *
 * @private
 * @param key - localStorage key to read
 * @returns Stored value or null
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Parse a JSON build-time define, returning an empty object on failure.
 *
 * @private
 * @param raw - Raw JSON string from build-time define
 * @returns Parsed color overrides object
 */
function parseColors(raw: string): Record<string, string> {
  if (!raw || raw === '""' || raw === 'undefined') {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'string'
      )
    ) as Record<string, string>
  } catch {
    return {}
  }
}

/**
 * useLayoutEffect on the client, useEffect on the server (avoids SSR warning).
 * Ensures DOM mutations happen synchronously before browser paint.
 *
 * @private
 * @returns The appropriate effect hook for the current environment
 */
function getIsomorphicEffect(): typeof useLayoutEffect {
  return match(globalThis.window)
    .with(P.nonNullable, () => useLayoutEffect)
    .otherwise(() => useEffect)
}

/**
 * Clear the JS-driven dots animation interval set by loader-dots.js.
 *
 * @private
 */
function clearDotsInterval(): void {
  const g = globalThis as Record<string, unknown>
  const dotsInterval = g.__zpDotsInterval as ReturnType<typeof setInterval> | undefined
  if (dotsInterval !== undefined) {
    clearInterval(dotsInterval)
    delete g.__zpDotsInterval
  }
}

/**
 * Dismiss the loading overlay with a two-phase approach:
 *   1. Add `zp-loader-fade` class — CSS transitions opacity to 0
 *   2. After transition completes — set `data-zp-ready` attribute — CSS hard removes (display: none)
 *
 * Also clears the JS-driven dots animation interval set by loader-dots.js.
 *
 * Returns a cleanup function that cancels pending timers.
 *
 * @private
 * @param html - HTML document element
 * @returns Cleanup function that cancels pending timers
 */
function dismissLoader(html: HTMLElement): () => void {
  const fadeTimer = setTimeout(() => {
    html.classList.add('zp-loader-fade')
  }, LOADER_MIN_DISPLAY_MS)

  const removeTimer = setTimeout(() => {
    html.dataset.zpReady = 'true'
    html.classList.remove('zp-loader-fade')
    clearDotsInterval()
  }, LOADER_MIN_DISPLAY_MS + LOADER_FADE_MS)

  return () => {
    clearTimeout(fadeTimer)
    clearTimeout(removeTimer)
    html.classList.remove('zp-loader-fade')
    clearDotsInterval()
  }
}
