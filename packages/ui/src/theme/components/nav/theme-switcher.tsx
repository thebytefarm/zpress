import React, { useCallback, useEffect, useRef, useState } from 'react'
import { match, P } from 'ts-pattern'

import { Icon } from '../shared/icon.tsx'

import './theme-switcher.css'

declare const __ZPRESS_THEME_SWITCHER__: boolean
declare const __ZPRESS_THEME_REGISTRY__: string

type Variant = 'dark' | 'light'

interface ThemeOption {
  readonly name: string
  readonly label: string
  readonly swatch: string
  readonly variants: readonly Variant[]
  readonly defaultVariant: Variant
}

const THEME_OPTIONS: readonly ThemeOption[] = parseThemeRegistry(__ZPRESS_THEME_REGISTRY__)

const VALID_THEME_NAMES = new Set(THEME_OPTIONS.map((t) => t.name))

const FALLBACK_THEME = match(THEME_OPTIONS[0])
  .with(P.nullish, () => 'default')
  .otherwise((entry) => entry.name)

/**
 * ThemeSwitcher — dropdown button for switching between registered themes.
 * Only renders when `__ZPRESS_THEME_SWITCHER__` build-time define is true.
 *
 * Switching a theme updates `data-zp-theme` and `data-zp-variants` on
 * `<html>`. When the newly active theme does not declare the user's
 * previously selected variant, falls back to the new theme's
 * `defaultVariant` and mirrors that to Rspress's `.rp-dark` class.
 *
 * @returns React element or null when theme switching is disabled
 */
export function ThemeSwitcher(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState(initialThemeName)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleSelect = useCallback((theme: ThemeOption) => {
    setActiveTheme(theme.name)
    applyTheme(theme)
    setIsOpen(false)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (!__ZPRESS_THEME_SWITCHER__) {
    return null
  }

  return (
    <div className="zp-theme-switcher" ref={containerRef}>
      <button
        className="zp-theme-switcher__btn"
        onClick={handleToggle}
        aria-label="Switch theme"
        type="button"
      >
        <Icon icon="mdi:palette-outline" width={16} height={16} />
      </button>
      {isOpen && (
        <div className="zp-theme-switcher__dropdown">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.name}
              className={optionClassName(activeTheme === theme.name)}
              onClick={() => handleSelect(theme)}
              type="button"
            >
              <span
                className="zp-theme-switcher__swatch"
                style={{ backgroundColor: theme.swatch }}
              />
              <span className="zp-theme-switcher__name">{theme.label}</span>
              {activeTheme === theme.name && (
                <span className="zp-theme-switcher__check">{'✓'}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve the active theme name for first render. Reads
 * `localStorage['zpress-theme']` when available; falls back to the first
 * registered theme when the value is missing or stale.
 *
 * @private
 * @returns Resolved theme name
 */
function initialThemeName(): string {
  if (globalThis.window === undefined) {
    return FALLBACK_THEME
  }
  try {
    return sanitizeThemeName(globalThis.localStorage.getItem('zpress-theme'))
  } catch {
    return FALLBACK_THEME
  }
}

/**
 * Validate a stored theme name, rejecting unknown values.
 *
 * @private
 * @param raw - Raw theme name from localStorage
 * @returns Sanitized theme name, defaulting to the first registered theme
 */
function sanitizeThemeName(raw: string | null): string {
  if (!raw) {
    return FALLBACK_THEME
  }
  if (VALID_THEME_NAMES.has(raw)) {
    return raw
  }
  return FALLBACK_THEME
}

/**
 * Build the className string for a theme option button.
 *
 * @private
 * @param isActive - Whether this option is the currently active theme
 * @returns CSS class name string
 */
function optionClassName(isActive: boolean): string {
  if (isActive) {
    return 'zp-theme-switcher__option zp-theme-switcher__option--active'
  }
  return 'zp-theme-switcher__option'
}

/**
 * Apply a theme by updating the DOM and persisting to localStorage.
 *
 * When the user's current variant is supported by the new theme, that
 * variant is preserved. Otherwise the new theme's `defaultVariant` is
 * applied — and Rspress's `.rp-dark` class is mirrored accordingly so
 * its built-in components stay aligned.
 *
 * Keep the persistence keys (`zpress-theme`, `zpress-variant`,
 * `rspress-theme-appearance`) and the `.rp-dark` / `data-zp-*` mirror
 * logic in sync with:
 *   - `packages/ui/src/config.ts` → `buildHeadScriptBody` (head IIFE)
 *   - `theme-provider.tsx` → `resolveActiveVariant` / `applyVariant`
 *
 * @private
 * @param theme - Theme option to apply
 */
function applyTheme(theme: ThemeOption): void {
  const html = document.documentElement
  html.dataset.zpTheme = theme.name
  html.dataset.zpVariants = theme.variants.join(' ')
  try {
    localStorage.setItem('zpress-theme', theme.name)
  } catch {
    // storage unavailable
  }

  const currentVariant = readCurrentVariant(html)
  const nextVariant = resolveNextVariant(currentVariant, theme)

  html.dataset.zpVariant = nextVariant
  if (nextVariant === 'dark') {
    html.classList.add('rp-dark', 'dark')
    html.dataset.dark = 'true'
  } else {
    html.classList.remove('rp-dark', 'dark')
    html.dataset.dark = 'false'
  }
  try {
    localStorage.setItem('rspress-theme-appearance', nextVariant)
    localStorage.setItem('zpress-variant', nextVariant)
  } catch {
    // storage unavailable
  }
}

/**
 * Pick the variant to apply after a theme switch — preserves the user's
 * current variant when the new theme supports it, otherwise falls back
 * to the new theme's `defaultVariant`.
 *
 * @private
 * @param current - Currently active variant (or `null` when none is set)
 * @param theme - Theme being switched to
 * @returns Resolved variant for the new theme
 */
function resolveNextVariant(current: Variant | null, theme: ThemeOption): Variant {
  if (current === null) {
    return theme.defaultVariant
  }
  if (theme.variants.includes(current)) {
    return current
  }
  return theme.defaultVariant
}

/**
 * Read the current `data-zp-variant` from `<html>` as a typed value.
 * Returns `null` when no attribute is present or the value isn't a
 * known variant.
 *
 * @private
 * @param html - HTML document element
 * @returns Current variant or `null`
 */
function readCurrentVariant(html: HTMLElement): Variant | null {
  const raw = html.dataset.zpVariant
  if (raw === 'dark' || raw === 'light') {
    return raw
  }
  return null
}

/**
 * Parse the `__ZPRESS_THEME_REGISTRY__` build-time define into a typed
 * list of theme options. Falls back to an empty list when the define is
 * missing or malformed — the switcher then renders no options.
 *
 * @private
 * @param raw - Raw JSON string from the build-time define
 * @returns Validated list of theme options
 */
function parseThemeRegistry(raw: string): readonly ThemeOption[] {
  if (!raw || raw === '""' || raw === 'undefined') {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isThemeOption)
  } catch {
    return []
  }
}

/**
 * Type-guard that validates a registry entry has the shape expected by
 * the switcher. Any entry missing required fields or carrying the wrong
 * runtime types is dropped silently.
 *
 * @private
 * @param value - Candidate registry entry
 * @returns True when the entry matches the `ThemeOption` shape
 */
function isThemeOption(value: unknown): value is ThemeOption {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const v = value as Record<string, unknown>
  if (typeof v.name !== 'string' || typeof v.label !== 'string' || typeof v.swatch !== 'string') {
    return false
  }
  if (v.defaultVariant !== 'dark' && v.defaultVariant !== 'light') {
    return false
  }
  if (!Array.isArray(v.variants)) {
    return false
  }
  return v.variants.every((m) => m === 'dark' || m === 'light')
}
