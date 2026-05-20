/**
 * SVG logo composer.
 *
 * Generates a compact logo SVG containing the project title
 * rendered as FIGlet ASCII art (or plain monospace fallback for long titles).
 */

import { renderFigletText, renderPixelText } from './figlet.ts'
import {
  ART_FONT_SIZE,
  ART_LINE_HEIGHT,
  CHAR_WIDTH_PX,
  COLORS,
  CONTENT_PADDING,
  FIGLET_MAX_LENGTH,
  FONT_STACK,
  GENERATED_MARKER,
} from './svg-shared.ts'

const LOGO_TOP_PAD = 28
const LOGO_BOTTOM_PAD = 28
const FIGLET_ROWS = 6

/**
 * Compose a logo SVG string from the project title.
 *
 * For titles ≤ 12 characters, renders FIGlet block art.
 * For longer titles, falls back to large monospace text.
 *
 * @param params - Logo configuration
 * @returns Complete SVG markup string with generated marker
 */
export function composeLogo(params: { readonly title: string }): string {
  const useFiglet = params.title.length <= FIGLET_MAX_LENGTH

  if (useFiglet) {
    const figlet = renderFigletText(params.title)
    const artPixelWidth = figlet.width * CHAR_WIDTH_PX
    const width = Math.ceil(artPixelWidth + CONTENT_PADDING * 2)
    const height = LOGO_TOP_PAD + (FIGLET_ROWS - 1) * ART_LINE_HEIGHT + LOGO_BOTTOM_PAD
    const artLines = buildArtLines({ lines: figlet.lines, startY: 0 })

    return [
      GENERATED_MARKER,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
      '  <defs>',
      '    <style>',
      `      .text { font-family: ${FONT_STACK}; }`,
      `      .brand { fill: ${COLORS.brand}; }`,
      '    </style>',
      '  </defs>',
      '',
      `  <g transform="translate(${CONTENT_PADDING}, ${LOGO_TOP_PAD})">`,
      artLines,
      '  </g>',
      '</svg>',
    ].join('\n')
  }

  const pixel = renderPixelText(params.title)
  const artPixelWidth = pixel.width * CHAR_WIDTH_PX
  const width = Math.ceil(artPixelWidth + CONTENT_PADDING * 2)
  const height = LOGO_TOP_PAD + (pixel.rows - 1) * ART_LINE_HEIGHT + LOGO_BOTTOM_PAD
  const artLines = buildArtLines({ lines: pixel.lines, startY: 0 })

  return [
    GENERATED_MARKER,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    '  <defs>',
    '    <style>',
    `      .text { font-family: ${FONT_STACK}; }`,
    `      .brand { fill: ${COLORS.brand}; }`,
    '    </style>',
    '  </defs>',
    '',
    `  <g transform="translate(${CONTENT_PADDING}, ${LOGO_TOP_PAD})">`,
    artLines,
    '  </g>',
    '</svg>',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build text art (FIGlet or pixel) as SVG text elements for the logo.
 *
 * @private
 * @param params - Art configuration
 * @param params.lines - Rendered text rows
 * @param params.startY - Vertical start position for the first line
 * @returns SVG text elements joined as a single string
 */
function buildArtLines(params: {
  readonly lines: readonly string[]
  readonly startY: number
}): string {
  return params.lines
    .map((line, i) => {
      const y = params.startY + i * ART_LINE_HEIGHT
      return `    <text class="text brand" font-size="${ART_FONT_SIZE}" y="${y}" xml:space="preserve">${line}</text>`
    })
    .join('\n')
}
