/**
 * Single source of truth for brand color hex values per built-in theme.
 *
 * Used by:
 *  - CLI TUI banner (`packages/cli/src/components/banner.tsx`)
 *  - SVG banner / logo generator (`packages/core/src/banner/svg-shared.ts`)
 *  - Static asset generators / scripts
 *
 * Runtime CSS still owns its own variables in
 * `packages/ui/src/theme/styles/themes/*.css` and the matching FOUC
 * critical CSS — keep the hex values in sync with the ones below.
 *
 * The hex literals themselves live as a private constant inside
 * `theme-registry.ts` (`BRAND_PALETTES`) so the built-in themes can use them
 * when building their `colors.brand` token groups. This module exposes the
 * same data — derived from `BUILT_IN_THEMES` — under the historical
 * `BRAND_COLORS` / `resolveBrandPalette` names for back-compat.
 */

import { BUILT_IN_THEMES } from './theme-registry.ts'
import type { BuiltInThemeName } from './types.ts'

/**
 * A 3-stop brand palette: primary, hover (darker), active (deepest).
 * The light/lighter shades used for hover states in Rspress mappings
 * are derived shades, not part of this contract.
 */
export interface BrandPalette {
  /** Primary brand color — buttons, links, accents. */
  readonly primary: string
  /** Hover state — typically one step darker than primary. */
  readonly hover: string
  /** Active / pressed state — deepest shade. */
  readonly active: string
  /** Foreground text color over the primary background. */
  readonly fg: string
  /** rgba() soft tint for backgrounds (badges, callouts). */
  readonly soft: string
}

/**
 * Brand palettes for each built-in theme.
 *
 * Pulled from each theme's default variant — brand colors stay constant
 * across variants for built-in themes, so picking `defaultVariant` is
 * unambiguous. Kept under the historical name so existing consumers
 * (`@zpress/core/banner`, CLI banner, asset scripts) continue to compile
 * unchanged.
 */
export const BRAND_COLORS: Readonly<Record<BuiltInThemeName, BrandPalette>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(BUILT_IN_THEMES) as BuiltInThemeName[]).map(
      (name): readonly [BuiltInThemeName, BrandPalette] => {
        const theme = BUILT_IN_THEMES[name]
        const defaultTokens = theme.variants[theme.defaultVariant]
        if (defaultTokens === undefined) {
          // Unreachable — `defineTheme` guarantees `defaultVariant` is present.
          return [name, Object.freeze({ primary: '', hover: '', active: '', fg: '', soft: '' })]
        }
        const { primary, hover, active, fg, soft } = defaultTokens.colors.brand
        return [name, Object.freeze({ primary, hover, active, fg, soft })]
      }
    )
  ) as Record<BuiltInThemeName, BrandPalette>
)

/**
 * 3-stop brand gradient for the CLI TUI banner — light → mid → dark.
 * Derived from each theme's palette plus a lighter top stop. The top stop
 * is not part of the runtime token tree (it only appears in the CLI banner),
 * so these values stay as raw literals rather than being derived from
 * `BUILT_IN_THEMES`.
 */
export const BRAND_GRADIENT: Readonly<Record<BuiltInThemeName, readonly string[]>> = Object.freeze({
  default: ['#a78bfa', '#8b5cf6', '#5b21b6'],
  midnight: ['#3b82f6', '#1d4ed8', '#1e3a8a'],
  arcade: ['#86efac', '#00ff88', '#00994f'],
})

/**
 * Get the brand palette for a built-in theme.
 *
 * @param theme - Built-in theme identifier.
 * @returns The theme's brand palette.
 */
export function resolveBrandPalette(theme: BuiltInThemeName): BrandPalette {
  return BRAND_COLORS[theme]
}

/**
 * Get the CLI gradient stops for a built-in theme.
 *
 * @param theme - Built-in theme identifier.
 * @returns Light → mid → dark gradient stops.
 */
export function resolveBrandGradient(theme: BuiltInThemeName): readonly string[] {
  return BRAND_GRADIENT[theme]
}
