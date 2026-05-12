/**
 * Built-in theme definitions and utilities.
 *
 * Every value here is derived from `BUILT_IN_THEMES` in `theme-registry.ts` —
 * the registry is the single source of truth for what themes exist, which
 * color modes they render correctly under, and which mode they default to.
 * Adding a new built-in theme is a one-file change in `theme-registry.ts`.
 */

import { BUILT_IN_THEMES } from './theme-registry.ts'
import type { BuiltInIconColor, BuiltInThemeName, ColorMode } from './types.ts'

/**
 * All built-in theme names — used for validation and iteration.
 *
 * Derived from `BUILT_IN_THEMES` insertion order so adding a theme to the
 * registry automatically extends this list (and every consumer that iterates
 * it: config validation, the theme switcher, asset generators).
 */
export const THEME_NAMES: readonly BuiltInThemeName[] = Object.freeze(
  Object.keys(BUILT_IN_THEMES) as BuiltInThemeName[]
)

/**
 * All valid color modes — used for validation.
 */
export const COLOR_MODES: readonly ColorMode[] = ['dark', 'light', 'toggle'] as const

/**
 * All built-in icon colors — used for validation and iteration.
 */
export const ICON_COLORS: readonly BuiltInIconColor[] = [
  'purple',
  'blue',
  'green',
  'amber',
  'cyan',
  'red',
  'pink',
  'slate',
] as const

/**
 * Resolve the default color mode for a given built-in theme.
 *
 * Reads `defaultMode` straight off the registry entry — no hard-coded match
 * arms, so changing a theme's default in `theme-registry.ts` is the only
 * edit required.
 *
 * @param theme - Built-in theme identifier
 * @returns The theme's natural color mode
 */
export function resolveDefaultColorMode(theme: BuiltInThemeName): ColorMode {
  return BUILT_IN_THEMES[theme].defaultMode
}

/**
 * Resolve the supported color modes for a given built-in theme.
 *
 * Reads `modes` straight off the registry entry — no hard-coded match arms,
 * so changing a theme's supported modes in `theme-registry.ts` is the only
 * edit required.
 *
 * @param theme - Built-in theme identifier
 * @returns The color modes the theme supports
 */
export function resolveThemeModes(theme: BuiltInThemeName): readonly ('dark' | 'light')[] {
  return BUILT_IN_THEMES[theme].modes
}

/**
 * Check if a theme name is a built-in theme.
 *
 * @param name - Theme name to check
 * @returns True if the theme is built-in
 */
export function isBuiltInTheme(name: string): name is BuiltInThemeName {
  return THEME_NAMES.includes(name as BuiltInThemeName)
}

/**
 * Check if an icon color is a built-in color.
 *
 * @param color - Icon color to check
 * @returns True if the color is built-in
 */
export function isBuiltInIconColor(color: string): color is BuiltInIconColor {
  return ICON_COLORS.includes(color as BuiltInIconColor)
}
