/**
 * SVG banner composer.
 *
 * Generates a terminal-themed banner SVG with:
 * 1. macOS title bar with traffic lights
 * 2. FIGlet ASCII art of the project title (or monospace fallback)
 * 3. Optional tagline in dim text
 * 4. Separator line
 * 5. Fake CLI output showing a dev server startup
 */

import { match, P } from 'ts-pattern'

import { renderFigletText, renderPixelText } from './figlet.ts'
import {
  ART_FONT_SIZE,
  ART_LINE_HEIGHT,
  CHAR_WIDTH_PX,
  CODE_FONT_SIZE,
  COLORS,
  CONTENT_PADDING,
  FIGLET_MAX_LENGTH,
  FONT_STACK,
  GENERATED_MARKER,
  MIN_BANNER_WIDTH,
  TITLE_BAR_HEIGHT,
  escapeXml,
} from './svg-shared.ts'

const ART_TOP_PAD = 26
const FIGLET_ROWS = 6
const TAGLINE_GAP = 24
const SEPARATOR_GAP = 16
const CLI_SECTION_HEIGHT = 240

/**
 * Compose a banner SVG string from the project title and optional tagline.
 *
 * For titles ≤ 12 characters, renders FIGlet block art.
 * For longer titles, falls back to large monospace text.
 * The banner includes a terminal chrome frame and fake CLI output.
 *
 * @param params - Banner configuration
 * @returns Complete SVG markup string with generated marker
 */
export function composeBanner(params: {
  readonly title: string
  readonly tagline: string | undefined
}): string {
  const cmdName = params.title.toLowerCase().replaceAll(/\s+/g, '')
  const art = computeArtLayout({ title: params.title, minWidth: MIN_BANNER_WIDTH })

  const trimmedTagline = resolveTagline(params.tagline)
  const taglineSection = match(trimmedTagline)
    .with(P.string.minLength(1), (tagline) => {
      const taglineY = art.artEndY + TAGLINE_GAP
      const separatorY = taglineY + SEPARATOR_GAP
      const centerX = Math.round(art.width / 2)

      return {
        markup: buildTagline({ text: tagline, centerX, y: taglineY }),
        separatorY,
      }
    })
    .otherwise(() => ({
      markup: '',
      separatorY: art.artEndY + SEPARATOR_GAP,
    }))

  const height = taglineSection.separatorY + CLI_SECTION_HEIGHT

  const sections = [
    GENERATED_MARKER,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${art.width} ${height}">`,
    buildStyles(),
    buildBackground({ width: art.width, height }),
    buildTitleBar({ width: art.width, name: cmdName }),
    art.artSection,
    taglineSection.markup,
    buildSeparator({ width: art.width, y: taglineSection.separatorY }),
    buildCliOutput({ name: cmdName, separatorY: taglineSection.separatorY }),
    '</svg>',
  ]

  return sections.filter((s) => s.length > 0).join('\n')
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Trim a tagline string, returning undefined if absent or empty.
 *
 * @private
 * @param tagline - Raw tagline string or undefined
 * @returns Trimmed tagline or undefined
 */
function resolveTagline(tagline: string | undefined): string | undefined {
  if (tagline) {
    return tagline.trim()
  }
  return undefined
}

/**
 * Computed layout dimensions and pre-rendered art SVG for the banner.
 *
 * @private
 */
interface BannerLayout {
  readonly width: number
  readonly height: number
  readonly artSection: string
  readonly artEndY: number
}

/**
 * Build the inline CSS `<defs>` block for the banner SVG.
 *
 * @private
 * @returns SVG `<defs>` string containing all style rules
 */
function buildStyles(): string {
  return [
    '  <defs>',
    '    <style>',
    `      .text { font-family: ${FONT_STACK}; }`,
    `      .code { font-family: ${FONT_STACK}; font-size: ${CODE_FONT_SIZE}px; }`,
    `      .brand { fill: ${COLORS.brand}; }`,
    `      .dim { fill: ${COLORS.overlay0}; }`,
    `      .tx { fill: ${COLORS.text}; }`,
    `      .st { fill: ${COLORS.green}; }`,
    `      .prompt { fill: ${COLORS.blue}; }`,
    `      .tab { font-family: ${FONT_STACK}; font-size: 11px; fill: ${COLORS.text}; }`,
    '    </style>',
    '  </defs>',
  ].join('\n')
}

/**
 * Build the background rectangle for the banner SVG.
 *
 * @private
 * @param params - Dimensions for the background
 * @param params.width - Banner width in pixels
 * @param params.height - Banner height in pixels
 * @returns SVG rect element string
 */
function buildBackground(params: { readonly width: number; readonly height: number }): string {
  return [
    '',
    '  <!-- Background -->',
    `  <rect width="${params.width}" height="${params.height}" rx="10" ry="10" fill="${COLORS.base}" />`,
  ].join('\n')
}

/**
 * Build the macOS-style title bar with traffic-light buttons.
 *
 * @private
 * @param params - Title bar configuration
 * @param params.width - Banner width in pixels
 * @param params.name - Display name shown in the title bar
 * @returns SVG elements for the title bar, traffic lights, and title text
 */
function buildTitleBar(params: { readonly width: number; readonly name: string }): string {
  const centerX = Math.round(params.width / 2)
  const escaped = escapeXml(params.name)
  return [
    '',
    '  <!-- Title bar -->',
    `  <rect width="${params.width}" height="${TITLE_BAR_HEIGHT}" rx="10" ry="10" fill="${COLORS.mantle}" />`,
    `  <rect y="26" width="${params.width}" height="10" fill="${COLORS.mantle}" />`,
    '',
    '  <!-- Traffic lights -->',
    `  <circle cx="20" cy="18" r="6" fill="${COLORS.red}" />`,
    `  <circle cx="40" cy="18" r="6" fill="${COLORS.yellow}" />`,
    `  <circle cx="60" cy="18" r="6" fill="${COLORS.green}" />`,
    '',
    '  <!-- Title bar text -->',
    `  <text class="text dim" font-size="12" x="${centerX}" y="22" text-anchor="middle">${escaped}</text>`,
  ].join('\n')
}

/**
 * Build text art (FIGlet or pixel) as SVG text elements within a positioned group.
 *
 * @private
 * @param params - Art configuration
 * @param params.lines - Rendered text rows
 * @param params.translateX - Horizontal offset for centering
 * @param params.startY - Vertical start position
 * @param params.label - Comment label for the SVG group
 * @returns SVG group element containing the art text lines
 */
function buildArtGroup(params: {
  readonly lines: readonly string[]
  readonly translateX: number
  readonly startY: number
  readonly label: string
}): string {
  const textLines = params.lines
    .map((line, i) => {
      const y = params.startY + i * ART_LINE_HEIGHT
      return `    <text class="text brand" font-size="${ART_FONT_SIZE}" y="${y}" xml:space="preserve">${line}</text>`
    })
    .join('\n')

  return [
    '',
    `  <!-- ${params.label} -->`,
    `  <g transform="translate(${params.translateX}, 0)">`,
    textLines,
    '  </g>',
  ].join('\n')
}

/**
 * Build the tagline text element centered below the art section.
 *
 * @private
 * @param params - Tagline configuration
 * @param params.text - Tagline string to display
 * @param params.centerX - Horizontal center position
 * @param params.y - Vertical position
 * @returns SVG text element for the tagline
 */
function buildTagline(params: {
  readonly text: string
  readonly centerX: number
  readonly y: number
}): string {
  const escaped = escapeXml(params.text)
  return [
    '',
    '  <!-- Tagline -->',
    `  <text class="text dim" font-size="12" x="${params.centerX}" y="${params.y}" text-anchor="middle">${escaped}</text>`,
  ].join('\n')
}

/**
 * Build a horizontal separator line across the banner width.
 *
 * @private
 * @param params - Separator configuration
 * @param params.width - Banner width in pixels
 * @param params.y - Vertical position of the line
 * @returns SVG line element string
 */
function buildSeparator(params: { readonly width: number; readonly y: number }): string {
  return [
    '',
    '  <!-- Separator -->',
    `  <line x1="16" y1="${params.y}" x2="${params.width - 16}" y2="${params.y}" stroke="${COLORS.surface0}" stroke-width="1" />`,
  ].join('\n')
}

/**
 * Build the fake CLI terminal output section of the banner.
 *
 * @private
 * @param params - CLI output configuration
 * @param params.name - Command name shown in terminal prompts
 * @param params.separatorY - Y position of the separator above this section
 * @returns SVG elements representing terminal tab, commands, and output
 */
function buildCliOutput(params: { readonly name: string; readonly separatorY: number }): string {
  const baseY = params.separatorY
  const x = 18

  return [
    '',
    '  <!-- Terminal tab -->',
    `  <rect x="4" y="${baseY + 4}" width="80" height="24" rx="4" ry="4" fill="${COLORS.mantle}" />`,
    `  <text class="tab" x="${x}" y="${baseY + 20}">terminal</text>`,
    '',
    '  <!-- CLI output -->',
    `  <text class="code" x="${x}" y="${baseY + 48}"><tspan class="prompt">~</tspan><tspan class="dim"> $ </tspan><tspan class="tx">${escapeXml(params.name)} dev</tspan></text>`,
    '',
    `  <text class="code" x="${x}" y="${baseY + 76}"><tspan class="dim">Starting </tspan><tspan class="brand">${escapeXml(params.name)}</tspan><tspan class="dim">...</tspan></text>`,
    '',
    `  <text class="code" x="${x}" y="${baseY + 100}" xml:space="preserve"><tspan class="st">  ✓</tspan><tspan class="tx"> Loaded config</tspan></text>`,
    `  <text class="code" x="${x}" y="${baseY + 116}" xml:space="preserve"><tspan class="st">  ✓</tspan><tspan class="tx"> Built 24 pages</tspan></text>`,
    `  <text class="code" x="${x}" y="${baseY + 132}" xml:space="preserve"><tspan class="st">  ✓</tspan><tspan class="tx"> Generated sidebar</tspan></text>`,
    `  <text class="code" x="${x}" y="${baseY + 148}" xml:space="preserve"><tspan class="st">  ✓</tspan><tspan class="tx"> Ready — dev server on :5173</tspan></text>`,
    '',
    '  <!-- New prompt with cursor -->',
    `  <text class="code" x="${x}" y="${baseY + 180}"><tspan class="prompt">~</tspan><tspan class="dim"> $ </tspan><tspan class="tx">&#x2588;</tspan></text>`,
  ].join('\n')
}

/**
 * Compute the art layout dimensions and SVG content for the banner title.
 *
 * Chooses between FIGlet block art (for short titles) and a large monospace
 * fallback, then calculates the width, art SVG content, and vertical end position.
 *
 * @private
 * @param params - Layout computation parameters
 * @param params.title - Project title to render
 * @param params.minWidth - Minimum banner width in pixels
 * @returns Layout dimensions and pre-rendered art SVG section
 */
function computeArtLayout(params: {
  readonly title: string
  readonly minWidth: number
}): BannerLayout {
  const useFiglet = params.title.length <= FIGLET_MAX_LENGTH

  if (useFiglet) {
    const figlet = renderFigletText(params.title)
    const artPixelWidth = figlet.width * CHAR_WIDTH_PX
    const contentWidth = Math.ceil(artPixelWidth + CONTENT_PADDING * 2)
    const width = Math.max(params.minWidth, contentWidth)
    const artStartY = TITLE_BAR_HEIGHT + ART_TOP_PAD
    const translateX = Math.round((width - artPixelWidth) / 2)
    const artEndY = artStartY + (FIGLET_ROWS - 1) * ART_LINE_HEIGHT

    const artSection = buildArtGroup({
      lines: figlet.lines,
      translateX,
      startY: artStartY,
      label: 'ASCII art',
    })

    return { width, height: 0, artSection, artEndY }
  }

  const pixel = renderPixelText(params.title)
  const artPixelWidth = pixel.width * CHAR_WIDTH_PX
  const contentWidth = Math.ceil(artPixelWidth + CONTENT_PADDING * 2)
  const width = Math.max(params.minWidth, contentWidth)
  const artStartY = TITLE_BAR_HEIGHT + ART_TOP_PAD
  const translateX = Math.round((width - artPixelWidth) / 2)
  const artEndY = artStartY + (pixel.rows - 1) * ART_LINE_HEIGHT

  const artSection = buildArtGroup({
    lines: pixel.lines,
    translateX,
    startY: artStartY,
    label: 'Pixel art (fallback)',
  })

  return { width, height: 0, artSection, artEndY }
}
