/**
 * Shared constants for SVG banner and logo generation.
 *
 * Surfaces / chrome use the Catppuccin Mocha palette to match the
 * existing zpress banner aesthetic. The `brand` slot is the active
 * theme's primary, pulled from `@zpress/theme` so static SVGs stay
 * in sync with the docs site CSS and the CLI TUI.
 */

import { resolveBrandPalette } from '@zpress/theme'

/**
 * Catppuccin Mocha palette colors used across all generated SVGs.
 * `brand` resolves to the base theme's primary at module load — the
 * same color the docs site and CLI render.
 */
export const COLORS = Object.freeze({
  base: '#1e1e2e',
  mantle: '#181825',
  surface0: '#313244',
  overlay0: '#6c7086',
  text: '#cdd6f4',
  blue: '#89b4fa',
  green: '#a6e3a1',
  red: '#f38ba8',
  yellow: '#f9e2af',
  brand: resolveBrandPalette('default').primary,
})

/**
 * Monospace font stack used for all SVG text elements.
 */
export const FONT_STACK = "'SF Mono', 'Fira Code', 'JetBrains Mono', Consolas, monospace"

/**
 * Approximate pixel width of a single monospace character at font-size 13px.
 */
export const CHAR_WIDTH_PX = 7.8

/**
 * Font size for FIGlet ASCII art text elements.
 */
export const ART_FONT_SIZE = 13

/**
 * Line height (in px) between FIGlet art rows.
 */
export const ART_LINE_HEIGHT = 16

/**
 * Font size for code/terminal text.
 */
export const CODE_FONT_SIZE = 12

/**
 * Height of the macOS-style title bar.
 */
export const TITLE_BAR_HEIGHT = 36

/**
 * Maximum title length (in characters) before falling back to plain text.
 */
export const FIGLET_MAX_LENGTH = 12

/**
 * Minimum banner width in pixels.
 */
export const MIN_BANNER_WIDTH = 600

/**
 * Horizontal padding on each side of the SVG content.
 */
export const CONTENT_PADDING = 24

/**
 * Comment placed as the first line of generated SVGs to distinguish
 * from user-customized files.
 */
export const GENERATED_MARKER = '<!-- zpress-generated -->'

/**
 * Escape special XML characters in text content.
 *
 * @param text - Raw string to escape for use in SVG/XML text nodes and attributes
 * @returns String with `&`, `<`, `>`, and `"` replaced by XML entities
 */
export function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
