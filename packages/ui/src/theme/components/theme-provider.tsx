import { TOKEN_TO_CSS_VAR } from '@zpress/theme'
import type { ThemeColors, ThemeVariant, TokenPath } from '@zpress/theme'
import { useEffect, useLayoutEffect } from 'react'
import type React from 'react'
import { match, P } from 'ts-pattern'

declare const __ZPRESS_THEME_NAME__: string
declare const __ZPRESS_DEFAULT_VARIANT__: string
declare const __ZPRESS_THEME_COLORS__: string
declare const __ZPRESS_THEME_DARK_COLORS__: string
declare const __ZPRESS_THEME_REGISTRY__: string

interface RegistryEntry {
  readonly name: string
  readonly variants: readonly ThemeVariant[]
  readonly defaultVariant: ThemeVariant
}

/**
 * `ThemeColors` field names whose values are applied to the DOM as
 * CSS custom-property overrides.
 */
type ThemeColorKey = keyof ThemeColors

/**
 * Parsed theme registry — built-in themes plus any user themes from
 * `config.themes`. Read from the build-time define so the client bundle
 * does not pull `@zpress/theme`'s factory + Zod into the runtime path.
 */
const REGISTRY_ENTRIES: readonly RegistryEntry[] = parseRegistry(__ZPRESS_THEME_REGISTRY__)

/**
 * Variants supported by each registered theme, keyed by theme name. Used
 * to set `data-zp-variants` on `<html>` so CSS can hide the appearance
 * toggle for themes that only declare one variant.
 */
const VARIANTS_BY_THEME: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(REGISTRY_ENTRIES.map((entry) => [entry.name, entry.variants.join(' ')]))
)

/**
 * Default variant for each theme — used when no `zpress-variant` is
 * persisted in `localStorage` or when the persisted value is stale.
 */
const DEFAULT_VARIANT_BY_THEME: Readonly<Record<string, ThemeVariant>> = Object.freeze(
  Object.fromEntries(REGISTRY_ENTRIES.map((entry) => [entry.name, entry.defaultVariant]))
)

/**
 * Set of theme names known at build time. Used to validate a persisted
 * theme name from `localStorage` before applying it.
 */
const REGISTERED_THEME_NAMES: ReadonlySet<string> = new Set(REGISTRY_ENTRIES.map((e) => e.name))

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
 * ThemeProvider — global UI component that configures the active theme
 * and variant.
 *
 * Sets `data-zp-theme`, `data-zp-variant`, and `data-zp-variants` on
 * `<html>` so theme CSS resolves correctly. Mirrors variant changes to
 * Rspress's `.rp-dark` class so Rspress's built-in components stay in
 * sync with our variant state, and observes Rspress's class to persist
 * variant changes triggered by Rspress's own dark-mode toggle.
 *
 * Sets `data-zp-ready` on `<html>` to dismiss the loading overlay
 * injected by critical CSS.
 *
 * @returns Null element (side-effect only component)
 */
export function ThemeProvider(): React.ReactElement | null {
  useIsomorphicLayoutEffect(() => {
    const html = document.documentElement
    const persistedTheme = safeGetItem('zpress-theme')
    const themeName = resolveActiveThemeName(persistedTheme)
    if (persistedTheme !== null && persistedTheme !== themeName) {
      safeRemoveItem('zpress-theme')
    }

    const persistedVariant = safeGetVariant('zpress-variant')
    const buildTimeDefault = parseVariant(__ZPRESS_DEFAULT_VARIANT__)
    const variant = resolveActiveVariant({
      persisted: persistedVariant,
      buildTimeDefault,
      themeName,
    })
    if (persistedVariant !== null && persistedVariant !== variant) {
      safeRemoveItem('zpress-variant')
    }

    const colors = parseColors(__ZPRESS_THEME_COLORS__)
    const darkColors = parseColors(__ZPRESS_THEME_DARK_COLORS__)
    const hasColors = Object.keys(colors).length > 0
    const hasDarkColors = Object.keys(darkColors).length > 0

    // 1. Set theme attribute
    html.dataset.zpTheme = themeName

    // 2. Set supported variants — CSS hides the appearance toggle for
    //    themes that only declare one variant.
    const variants = VARIANTS_BY_THEME[themeName]
    if (variants) {
      html.dataset.zpVariants = variants
    } else {
      html.dataset.zpVariants = 'dark'
    }

    // 3. Apply the resolved variant — both as `data-zp-variant` (our
    //    canonical attribute used by emitted theme CSS) and by mirroring
    //    to Rspress's `.rp-dark` class so its components stay aligned.
    applyVariant(html, variant)

    // 4. Apply light-mode color overrides immediately.
    if (hasColors) {
      applyColorOverrides(html, colors)
    }

    // 5. Apply dark-mode color overrides when starting in dark.
    if (variant === 'dark' && hasDarkColors) {
      applyColorOverrides(html, darkColors)
    }

    // 6. Observe `.rp-dark` class changes so Rspress's built-in dark
    //    toggle stays the single source of truth for variant flips. The
    //    new variant must be present in the active theme's supported
    //    set; if it isn't (e.g. a devtools tinkerer flips `.rp-dark` off
    //    on `midnight`, which is dark-only), snap the class back rather
    //    than persisting an unsupported variant.
    const supportedSet = new Set((VARIANTS_BY_THEME[themeName] ?? 'dark').split(' '))
    const observer = new MutationObserver((mutations) => {
      const classChanged = mutations.some((m) => m.attributeName === 'class')
      if (!classChanged) {
        return
      }
      const nowDark = html.classList.contains('rp-dark')
      const nextVariant = match(nowDark)
        .with(true, (): ThemeVariant => 'dark')
        .otherwise((): ThemeVariant => 'light')
      if (html.dataset.zpVariant === nextVariant) {
        return
      }
      if (!supportedSet.has(nextVariant)) {
        // Unsupported variant for the active theme — snap Rspress's
        // class state back to match the current `data-zp-variant` and
        // do NOT persist the illegal flip.
        //
        // The classList mutation below re-fires this observer. The
        // re-entrant pass hits the `dataset.zpVariant === nextVariant`
        // early return above — safe, just one extra callback.
        if (html.dataset.zpVariant === 'dark') {
          html.classList.add('rp-dark', 'dark')
          html.dataset.dark = 'true'
        } else {
          html.classList.remove('rp-dark', 'dark')
          html.dataset.dark = 'false'
        }
        return
      }
      html.dataset.zpVariant = nextVariant
      persistVariant(nextVariant)
      clearColorOverrides(html)
      if (hasColors) {
        applyColorOverrides(html, colors)
      }
      if (nextVariant === 'dark' && hasDarkColors) {
        applyColorOverrides(html, darkColors)
      }
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })

    // 7. Dismiss loading overlay
    const cancelLoader = dismissLoader(html)

    return () => {
      observer.disconnect()
      cancelLoader()
    }
  }, [])

  return null
}

export { ThemeProvider as default }

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the theme name to apply for this render.
 *
 * Returns the persisted localStorage value when it points at a registered
 * theme; falls back to the build-time default otherwise.
 *
 * @private
 * @param persisted - Value read from `localStorage['zpress-theme']` (or `null`)
 * @returns Resolved theme name
 */
function resolveActiveThemeName(persisted: string | null): string {
  if (persisted !== null && REGISTERED_THEME_NAMES.has(persisted)) {
    return persisted
  }
  return __ZPRESS_THEME_NAME__
}

/**
 * Resolve the variant to apply for this render. Honours persisted state
 * when it's still valid for the active theme; otherwise uses the theme's
 * own default variant; otherwise the build-time default; otherwise dark.
 *
 * Keep the resolution ladder in sync with:
 *   - `packages/ui/src/config.ts` → `buildHeadScriptBody` (head IIFE)
 *   - `theme-switcher.tsx` → `applyTheme` (user-driven theme change)
 *
 * @private
 * @param params - Persisted variant, build-time default, active theme name
 * @returns Resolved variant for this render
 */
function resolveActiveVariant(params: {
  readonly persisted: ThemeVariant | null
  readonly buildTimeDefault: ThemeVariant | null
  readonly themeName: string
}): ThemeVariant {
  const supported = VARIANTS_BY_THEME[params.themeName]
  const supportedVariants = match(supported)
    .with(P.nullish, () => ['dark'])
    .otherwise((s) => s.split(' '))
  const supportedSet = new Set(supportedVariants)
  if (params.persisted !== null && supportedSet.has(params.persisted)) {
    return params.persisted
  }
  const themeDefault = DEFAULT_VARIANT_BY_THEME[params.themeName]
  if (themeDefault !== undefined && supportedSet.has(themeDefault)) {
    return themeDefault
  }
  if (params.buildTimeDefault !== null && supportedSet.has(params.buildTimeDefault)) {
    return params.buildTimeDefault
  }
  if (supportedSet.has('dark')) {
    return 'dark'
  }
  return 'light'
}

/**
 * Apply the resolved variant to `<html>` — sets `data-zp-variant`,
 * toggles Rspress's `.rp-dark` / `.dark` classes, and mirrors the value
 * into Rspress's `localStorage['rspress-theme-appearance']` key so a
 * server-rendered first paint matches.
 *
 * @private
 * @param html - HTML document element
 * @param variant - Variant to apply
 */
function applyVariant(html: HTMLElement, variant: ThemeVariant): void {
  html.dataset.zpVariant = variant
  if (variant === 'dark') {
    html.classList.add('rp-dark', 'dark')
    html.dataset.dark = 'true'
  } else {
    html.classList.remove('rp-dark', 'dark')
    html.dataset.dark = 'false'
  }
  try {
    localStorage.setItem('rspress-theme-appearance', variant)
  } catch {
    // storage unavailable
  }
}

/**
 * Persist the user's variant preference so it survives reloads.
 *
 * @private
 * @param variant - Variant to remember
 */
function persistVariant(variant: ThemeVariant): void {
  try {
    localStorage.setItem('zpress-variant', variant)
  } catch {
    // storage unavailable
  }
}

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
 * Safe localStorage delete — silently ignores storage exceptions.
 *
 * @private
 * @param key - localStorage key to remove
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // storage unavailable
  }
}

/**
 * Read a localStorage entry and parse it as a `ThemeVariant`. Returns
 * `null` when the entry is missing, unparseable, or not a known variant.
 *
 * @private
 * @param key - localStorage key to read
 * @returns Parsed variant or `null`
 */
function safeGetVariant(key: string): ThemeVariant | null {
  return parseVariant(safeGetItem(key))
}

/**
 * Coerce a raw string into a `ThemeVariant`, or return `null` when the
 * value is not a known variant.
 *
 * @private
 * @param raw - Candidate variant value (may be `null` or arbitrary string)
 * @returns Validated variant or `null`
 */
function parseVariant(raw: string | null): ThemeVariant | null {
  if (raw === 'dark' || raw === 'light') {
    return raw
  }
  return null
}

/**
 * Parse the build-time theme registry define and return the resolved
 * `{ name, variants, defaultVariant }` entries. Returns an empty array
 * on any malformed input so the caller can intersect against an empty
 * set without crashing.
 *
 * @private
 * @param raw - Raw JSON string from `__ZPRESS_THEME_REGISTRY__`
 * @returns Resolved registry entries
 */
function parseRegistry(raw: string): readonly RegistryEntry[] {
  if (!raw || raw === '""' || raw === 'undefined') {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.flatMap(toRegistryEntry)
  } catch {
    return []
  }
}

/**
 * Lift a raw registry entry into a typed `RegistryEntry`, returning an
 * empty array for malformed entries so the caller can `flatMap` cleanly.
 *
 * @private
 * @param entry - Raw entry from the parsed JSON array
 * @returns Single-element array on success, empty array on shape mismatch
 */
function toRegistryEntry(entry: unknown): readonly RegistryEntry[] {
  if (entry === null || typeof entry !== 'object') {
    return []
  }
  const { name, variants, defaultVariant } = entry as {
    name?: unknown
    variants?: unknown
    defaultVariant?: unknown
  }
  if (typeof name !== 'string') {
    return []
  }
  const resolvedVariants = parseVariantList(variants)
  if (resolvedVariants.length === 0) {
    return [{ name, variants: ['dark'], defaultVariant: 'dark' }]
  }
  const defaultVariantString = match(defaultVariant)
    .with(P.string, (s) => s)
    .otherwise(() => null)
  const resolvedDefault = parseVariant(defaultVariantString)
  const fallbackDefault = resolvedVariants[0] as ThemeVariant
  return [
    {
      name,
      variants: resolvedVariants,
      defaultVariant: resolvedDefault ?? fallbackDefault,
    },
  ]
}

/**
 * Coerce an unknown value into a `readonly ThemeVariant[]`, dropping any
 * entries that don't parse cleanly.
 *
 * @private
 * @param raw - Candidate variant list from the registry JSON
 * @returns Filtered list of known variants
 */
function parseVariantList(raw: unknown): readonly ThemeVariant[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.flatMap((v) => {
    const candidate = match(v)
      .with(P.string, (s) => s)
      .otherwise(() => null)
    const parsed = parseVariant(candidate)
    if (parsed === null) {
      return []
    }
    return [parsed]
  })
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
