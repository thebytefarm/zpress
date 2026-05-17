import { BUILT_IN_THEMES } from './theme-registry.ts'
import type { BuiltInIconColor, BuiltInThemeName, ThemeVariant } from './types.ts'

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
 * All valid theme variants — used for validation.
 */
export const THEME_VARIANTS: readonly ThemeVariant[] = ['dark', 'light'] as const

/**
 * Alias retained for migration ergonomics — equivalent to `THEME_VARIANTS`.
 *
 * @deprecated Use {@link THEME_VARIANTS}.
 */
export const COLOR_MODES: readonly ThemeVariant[] = THEME_VARIANTS

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
 * Resolve the default variant for a given built-in theme.
 *
 * Reads `defaultVariant` straight off the registry entry — no hard-coded
 * match arms, so changing a theme's default in `theme-registry.ts` is the
 * only edit required.
 *
 * @param theme - Built-in theme identifier
 * @returns The theme's default variant (`'dark'` or `'light'`)
 */
export function resolveDefaultVariant(theme: BuiltInThemeName): ThemeVariant {
  return BUILT_IN_THEMES[theme].defaultVariant
}

/**
 * Alias retained for migration ergonomics — equivalent to
 * `resolveDefaultVariant`.
 *
 * @deprecated Use {@link resolveDefaultVariant}.
 */
export function resolveDefaultColorMode(theme: BuiltInThemeName): ThemeVariant {
  return resolveDefaultVariant(theme)
}

/**
 * Resolve the supported variants for a given built-in theme.
 *
 * Reads `variants` straight off the registry entry — no hard-coded match
 * arms, so changing a theme's supported variants in `theme-registry.ts`
 * is the only edit required.
 *
 * @param theme - Built-in theme identifier
 * @returns The variants the theme supports (in `dark` → `light` order)
 */
export function resolveThemeVariants(theme: BuiltInThemeName): readonly ThemeVariant[] {
  return THEME_VARIANTS.filter((v) => BUILT_IN_THEMES[theme].variants[v] !== undefined)
}

/**
 * Alias retained for migration ergonomics — equivalent to
 * `resolveThemeVariants`.
 *
 * @deprecated Use {@link resolveThemeVariants}.
 */
export function resolveThemeModes(theme: BuiltInThemeName): readonly ThemeVariant[] {
  return resolveThemeVariants(theme)
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
