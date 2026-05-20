/**
 * FIGlet text renderers.
 *
 * Two renderers:
 * 1. `renderFigletText` — ANSI Shadow (primary zpress brand font)
 * 2. `renderPixelText` — compact pixel-art (retro fallback for long titles)
 */

import { range } from 'es-toolkit'

import {
  FIGLET_CHARS,
  FIGLET_CHAR_GAP,
  FIGLET_ROWS,
  PIXEL_CHARS,
  PIXEL_CHAR_GAP,
  PIXEL_ROWS,
} from './figlet-data.ts'

/**
 * Result of rendering a FIGlet text block.
 */
export interface FigletResult {
  /**
   * The rendered text rows (one string per row).
   */
  readonly lines: readonly string[]
  /**
   * Width of the widest row in monospace character columns.
   */
  readonly width: number
  /**
   * Number of rows in the rendered block.
   */
  readonly rows: number
}

/**
 * Render a plain-text string as ANSI Shadow FIGlet block art.
 *
 * Uppercases the input, maps each character to its ANSI Shadow glyph,
 * and joins rows horizontally.
 *
 * @param text - The text to render (A-Z, 0-9, space, hyphen, dot, underscore)
 * @returns Rendered lines, width in monospace columns, and row count
 */
export function renderFigletText(text: string): FigletResult {
  return renderGlyphs({
    text,
    chars: FIGLET_CHARS,
    gap: FIGLET_CHAR_GAP,
    rows: FIGLET_ROWS,
  })
}

/**
 * Render a plain-text string as pixel block art.
 *
 * Uppercases the input, maps each character to its pixel glyph,
 * and joins rows horizontally. Compact retro-gaming style for long titles.
 *
 * @param text - The text to render (A-Z, 0-9, space, hyphen, dot, underscore)
 * @returns Rendered lines, width in monospace columns, and row count
 */
export function renderPixelText(text: string): FigletResult {
  return renderGlyphs({
    text,
    chars: PIXEL_CHARS,
    gap: PIXEL_CHAR_GAP,
    rows: PIXEL_ROWS,
  })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

interface RenderGlyphsParams {
  readonly text: string
  readonly chars: Readonly<Record<string, readonly string[]>>
  readonly gap: string
  readonly rows: number
}

/**
 * Generic glyph renderer shared by both font styles.
 *
 * @private
 * @param params - Text, character map, gap string, and row count
 * @returns Rendered lines, width, and row count
 */
function renderGlyphs(params: RenderGlyphsParams): FigletResult {
  const upperChars = [...params.text.toUpperCase()]
  const spaceGlyph = params.chars[' ']
  const glyphs = upperChars.map((c) => {
    const glyph = params.chars[c]
    if (glyph) {
      return glyph
    }
    return spaceGlyph
  })

  const lines = range(params.rows).map((row) => glyphs.map((glyph) => glyph[row]).join(params.gap))

  const width = Math.max(...lines.map((line) => line.length))

  return { lines, width, rows: params.rows }
}
