/**
 * SVG icon (favicon) composer.
 *
 * Generates a 512x512 rounded-square icon containing the first
 * letter of the project title rendered as FIGlet ASCII art
 * (or a large monospace fallback for unsupported characters).
 */

import { renderFigletText } from './figlet.ts'
import {
  ART_FONT_SIZE,
  ART_LINE_HEIGHT,
  CHAR_WIDTH_PX,
  COLORS,
  FONT_STACK,
  GENERATED_MARKER,
  escapeXml,
} from './svg-shared.ts'

const ICON_SIZE = 512
const ICON_RADIUS = 32
const ICON_PADDING = 64
const FIGLET_ROWS = 6
/**
 * Font size for the single-character fallback — larger than banner/logo
 * to fill the 512px square.
 */
const ICON_FALLBACK_FONT_SIZE = 320

/**
 * Compose a favicon SVG string from the project title.
 *
 * Extracts the first character, renders it as FIGlet block art
 * centered on a dark rounded square. Falls back to a large
 * monospace character when the glyph is unavailable.
 *
 * @param params - Icon configuration
 * @returns Complete SVG markup string with generated marker
 */
export function composeIcon(params: { readonly title: string }): string {
  const [firstChar = 'Z'] = [...params.title.trimStart()]
  const figlet = renderFigletText(firstChar)
  const hasFigletGlyph = figlet.lines.some((line) => line.trim().length > 0)

  if (hasFigletGlyph) {
    return buildFigletIcon({ lines: figlet.lines, width: figlet.width })
  }

  return buildFallbackIcon({ char: firstChar })
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Build a FIGlet-based icon SVG with the glyph scaled and centered in a 512px square.
 *
 * @private
 * @param params - FIGlet icon configuration
 * @param params.lines - Rendered FIGlet text rows for the character
 * @param params.width - Width of the FIGlet glyph in character columns
 * @returns Complete SVG markup string for the FIGlet icon
 */
function buildFigletIcon(params: {
  readonly lines: readonly string[]
  readonly width: number
}): string {
  const artPixelWidth = params.width * CHAR_WIDTH_PX
  const artPixelHeight = (FIGLET_ROWS - 1) * ART_LINE_HEIGHT
  const usable = ICON_SIZE - ICON_PADDING * 2
  const scale = Math.min(usable / artPixelWidth, usable / artPixelHeight)
  const scaledWidth = artPixelWidth * scale
  const scaledHeight = artPixelHeight * scale
  const translateX = Math.round((ICON_SIZE - scaledWidth) / 2)
  const translateY = Math.round((ICON_SIZE - scaledHeight) / 2)

  const textLines = params.lines
    .map((line, i) => {
      const y = i * ART_LINE_HEIGHT
      return `      <text class="text brand" font-size="${ART_FONT_SIZE}" y="${y}" xml:space="preserve">${escapeXml(line)}</text>`
    })
    .join('\n')

  return [
    GENERATED_MARKER,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">`,
    '  <defs>',
    '    <style>',
    `      .text { font-family: ${FONT_STACK}; }`,
    `      .brand { fill: ${COLORS.brand}; }`,
    '    </style>',
    '  </defs>',
    '',
    '  <!-- Background -->',
    `  <rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${ICON_RADIUS}" ry="${ICON_RADIUS}" fill="${COLORS.base}" />`,
    '',
    '  <!-- FIGlet letter -->',
    `  <g transform="translate(${translateX}, ${translateY}) scale(${scale.toFixed(4)})">`,
    textLines,
    '  </g>',
    '</svg>',
  ].join('\n')
}

/**
 * Build a fallback icon SVG with a single large character centered in a 512px square.
 *
 * @private
 * @param params - Fallback icon configuration
 * @param params.char - Single character to render
 * @returns Complete SVG markup string for the fallback icon
 */
function buildFallbackIcon(params: { readonly char: string }): string {
  const centerX = ICON_SIZE / 2
  const centerY = ICON_SIZE / 2 + ICON_FALLBACK_FONT_SIZE * 0.35
  const escaped = escapeXml(params.char)

  return [
    GENERATED_MARKER,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">`,
    '  <defs>',
    '    <style>',
    `      .text { font-family: ${FONT_STACK}; }`,
    `      .brand { fill: ${COLORS.brand}; }`,
    '    </style>',
    '  </defs>',
    '',
    '  <!-- Background -->',
    `  <rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="${ICON_RADIUS}" ry="${ICON_RADIUS}" fill="${COLORS.base}" />`,
    '',
    '  <!-- Fallback letter -->',
    `  <text class="text brand" font-size="${ICON_FALLBACK_FONT_SIZE}" x="${centerX}" y="${centerY}" text-anchor="middle">${escaped}</text>`,
    '</svg>',
  ].join('\n')
}
