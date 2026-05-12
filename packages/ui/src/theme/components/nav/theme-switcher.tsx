import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from '../shared/icon.tsx'

import './theme-switcher.css'

declare const __ZPRESS_THEME_SWITCHER__: boolean
declare const __ZPRESS_THEME_REGISTRY__: string

interface ThemeOption {
  readonly name: string
  readonly label: string
  readonly swatch: string
  readonly defaultColorMode: 'dark' | 'light' | 'toggle'
  readonly modes: readonly ('dark' | 'light')[]
}

const THEME_OPTIONS: readonly ThemeOption[] = parseThemeRegistry(__ZPRESS_THEME_REGISTRY__)

const VALID_THEME_NAMES = new Set(THEME_OPTIONS.map((t) => t.name))

/**
 * ThemeSwitcher — dropdown button for switching between built-in themes.
 * Only renders when `__ZPRESS_THEME_SWITCHER__` build-time define is true.
 *
 * @returns React element or null when theme switching is disabled
 */
export function ThemeSwitcher(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState(() => {
    if (globalThis.window === undefined) {
      return 'base'
    }
    try {
      return sanitizeThemeName(globalThis.localStorage.getItem('zpress-theme'))
    } catch {
      return 'base'
    }
  })
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
                <span className="zp-theme-switcher__check">{'\u2713'}</span>
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
 * Validate a stored theme name, rejecting unknown values.
 *
 * @private
 * @param raw - Raw theme name from localStorage
 * @returns Sanitized theme name, defaulting to 'base'
 */
function sanitizeThemeName(raw: string | null): string {
  if (!raw) {
    return 'base'
  }
  if (VALID_THEME_NAMES.has(raw)) {
    return raw
  }
  return 'base'
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
 * @private
 * @param theme - Theme option to apply
 */
function applyTheme(theme: ThemeOption): void {
  const html = document.documentElement
  html.dataset.zpTheme = theme.name
  localStorage.setItem('zpress-theme', theme.name)

  html.dataset.zpModes = theme.modes.join(' ')

  if (theme.defaultColorMode === 'dark') {
    // 'rp-dark' is Rspress's dark mode class; 'dark' is added for Tailwind compatibility
    html.classList.add('rp-dark', 'dark')
    html.dataset.dark = 'true'
    localStorage.setItem('rspress-theme-appearance', 'dark')
  } else if (theme.defaultColorMode === 'light') {
    // Remove both Rspress and Tailwind dark mode classes
    html.classList.remove('rp-dark', 'dark')
    html.dataset.dark = 'false'
    localStorage.setItem('rspress-theme-appearance', 'light')
  }
}

/**
 * Parse the `__ZPRESS_THEME_REGISTRY__` build-time define into a typed
 * list of theme options. The define is a JSON string emitted by
 * `packages/ui/src/config.ts` from `BUILT_IN_THEMES`, so iteration order
 * matches the registry's insertion order (base, midnight, arcade).
 * Falls back to an empty list when the define is missing or malformed —
 * the switcher then renders no options, which is the safest no-op.
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
 * @returns True when the entry matches the ThemeOption shape
 */
function isThemeOption(value: unknown): value is ThemeOption {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const v = value as Record<string, unknown>
  if (typeof v.name !== 'string' || typeof v.label !== 'string' || typeof v.swatch !== 'string') {
    return false
  }
  if (
    v.defaultColorMode !== 'dark' &&
    v.defaultColorMode !== 'light' &&
    v.defaultColorMode !== 'toggle'
  ) {
    return false
  }
  if (!Array.isArray(v.modes)) {
    return false
  }
  return v.modes.every((m) => m === 'dark' || m === 'light')
}
