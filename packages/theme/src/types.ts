import type { LiteralUnion } from 'type-fest'

/**
 * Theme name with autocomplete for built-in themes and support for custom themes.
 *
 * Built-in themes: 'default', 'midnight', 'arcade'
 * Custom themes: any string value
 */
export type ThemeName = LiteralUnion<'default' | 'midnight' | 'arcade', string>

/**
 * Built-in theme names for validation and iteration.
 */
export type BuiltInThemeName = 'default' | 'midnight' | 'arcade'

/**
 * The set of variants a theme can render in. A theme registers tokens
 * under each variant it supports (`variants.dark`, `variants.light`).
 * The sun/moon toggle in the topbar switches between variants of the
 * active theme; if a theme has only one variant, the toggle is hidden.
 */
export type ThemeVariant = 'dark' | 'light'

/**
 * Icon color with autocomplete for built-in colors and support for custom colors.
 *
 * Built-in colors: 'blue', 'purple', 'green', 'amber', 'cyan', 'red', 'pink', 'slate'
 * Custom colors: any string value
 */
export type IconColor = LiteralUnion<
  'blue' | 'purple' | 'green' | 'amber' | 'cyan' | 'red' | 'pink' | 'slate',
  string
>

/**
 * Built-in icon colors for validation and iteration.
 */
export type BuiltInIconColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'amber'
  | 'cyan'
  | 'red'
  | 'pink'
  | 'slate'

/**
 * Legacy alias for `ThemeVariant`. Retained for migration ergonomics — new
 * code should prefer `ThemeVariant`.
 *
 * @deprecated Use {@link ThemeVariant}.
 */
export type ColorMode = ThemeVariant

/**
 * Optional color overrides keyed to CSS custom properties.
 *
 * Each key maps to one or more `--zp-c-*` / `--rp-c-*` variables.
 * Values must be valid CSS color strings (hex or rgba).
 */
export interface ThemeColors {
  readonly brand?: string
  readonly brandLight?: string
  readonly brandDark?: string
  readonly brandSoft?: string
  readonly bg?: string
  readonly bgAlt?: string
  readonly bgElv?: string
  readonly bgSoft?: string
  readonly text1?: string
  readonly text2?: string
  readonly text3?: string
  readonly divider?: string
  readonly border?: string
  readonly homeBg?: string
}

/**
 * Top-level theme configuration for `zpress.config.ts`.
 */
export interface ThemeConfig {
  /**
   * Theme to use. Built-in themes get autocomplete, custom themes are also supported.
   * @default 'default'
   */
  readonly name?: ThemeName
  /**
   * Initial variant to render. When omitted, falls back to the theme's
   * own `defaultVariant`. A persisted value in `localStorage` overrides
   * this on subsequent visits when it points at a still-registered variant.
   */
  readonly variant?: ThemeVariant
  /**
   * Show the theme switcher dropdown in the nav bar.
   * @default false
   */
  readonly switcher?: boolean
  /**
   * Partial color overrides applied to the `light` variant.
   */
  readonly colors?: ThemeColors
  /**
   * Partial color overrides applied to the `dark` variant.
   */
  readonly darkColors?: ThemeColors
}
