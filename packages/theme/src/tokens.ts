/**
 * |===========================================================================|
 *   tokens.ts — Canonical design token registry for zpress
 *
 *   Defines the full `ZpressTokens` shape and a deterministic mapping from
 *   every leaf token path to a `--zp-*` CSS custom property name.
 *
 *   Source of truth: `.snapshots/baseline/token-audit.txt` (Phase 4 audit of
 *   `packages/ui/src/theme/**\/*.css`). Every raw value identified in that
 *   audit has a corresponding entry in `ZpressTokens` and an entry in
 *   `TOKEN_TO_CSS_VAR`.
 *
 *   Naming conventions (mirrors the audit):
 *     --zp-c-*           colors
 *     --zp-s-{N}         spacing scale (N = px value, 2-px grid)
 *     --zp-size-*        component sizes that aren't pure spacing
 *     --zp-radius-*      border-radius
 *     --zp-shadow-*      box-shadow
 *     --zp-z-*           z-index
 *     --zp-fs-*          font-size
 *     --zp-fw-*          font-weight
 *     --zp-ff-*          font-family
 *     --zp-lh-*          line-height
 *     --zp-letter-*      letter-spacing
 *     --zp-opacity-*     opacity
 *     --zp-duration-*    transition durations
 *     --zp-ease-*        transition easings
 *     --zp-bp-*          breakpoints
 *     --zp-blur-*        backdrop blur
 *     --zp-gradient-*    gradients
 * |===========================================================================|
 */

/**
 * Brand color palette — primary / hover / active / on-brand fg / soft tint
 * plus two derived light shades used by the Rspress compat layer.
 */
export interface ZpressBrandColors {
  readonly primary: string
  readonly hover: string
  readonly active: string
  readonly fg: string
  readonly soft: string
  readonly onBrand: string
  readonly light: string
  readonly lighter: string
}

/**
 * Semantic state colors used across badges, terminal lines, and prompts.
 */
export interface ZpressSemanticColors {
  readonly success: string
  readonly error: string
  readonly warn: string
  readonly info: string
  readonly muted: string
}

/**
 * Surface (background) colors.
 */
export interface ZpressSurfaceColors {
  readonly bg: string
  readonly bgAlt: string
  readonly bgElv: string
  readonly bgSoft: string
  readonly bgIcon: string
  readonly homeBg: string
  readonly overlayFaint: string
  readonly gutter: string
  readonly codeBlockBg: string
}

/**
 * Text foreground colors.
 */
export interface ZpressTextColors {
  readonly text1: string
  readonly text2: string
  readonly text3: string
}

/**
 * Border / divider colors.
 */
export interface ZpressBorderColors {
  readonly border: string
  readonly divider: string
  readonly sidebarAltBorderDark: string
}

/**
 * Icon rotation tints — the 8-color registry used by home-card, section-card,
 * status-badge, field-badge-deprecated, hero-demo, and split syntax tokens.
 * Each color exposes `bg` (12% alpha) + `fg` (solid).
 */
export interface ZpressTintColor {
  readonly bg: string
  readonly fg: string
}

/**
 * Brighter foreground-only tint variants used by syntax highlighting.
 */
export interface ZpressTintBrightColor {
  readonly fg: string
}

/**
 * Full tint palette covering the 8 rotation colors plus the 2 brighter
 * variants and the purple "glow" used by card-hover shadow recipes.
 */
export interface ZpressTintColors {
  readonly purple: ZpressTintColor
  readonly blue: ZpressTintColor
  readonly green: ZpressTintColor
  readonly amber: ZpressTintColor
  readonly red: ZpressTintColor
  readonly slate: ZpressTintColor
  readonly cyan: ZpressTintColor
  readonly pink: ZpressTintColor
  readonly purpleBright: ZpressTintBrightColor
  readonly amberBright: ZpressTintBrightColor
  readonly purpleGlow: string
}

/**
 * Terminal palette colors used by `.zp-window--terminal` and `.zp-term-text--*`.
 */
export interface ZpressTerminalColors {
  readonly bg: string
  readonly titlebarBg: string
  readonly border: string
  readonly title: string
  readonly text: string
  readonly promptPrefix: string
  readonly output: string
  readonly red: string
  readonly green: string
  readonly blue: string
  readonly yellow: string
  readonly cyan: string
  readonly magenta: string
  readonly white: string
  readonly gray: string
  readonly success: string
  readonly error: string
  readonly warn: string
  readonly info: string
  readonly muted: string
  readonly bar: string
  readonly step: string
}

/**
 * Window chrome — traffic-light dots and title fallback color.
 */
export interface ZpressWindowColors {
  readonly dotClose: string
  readonly dotMinimize: string
  readonly dotMaximize: string
  readonly titleFallback: string
}

/**
 * Status badge color pairs.
 */
export interface ZpressBadgeColor {
  readonly bg: string
  readonly fg: string
}

/**
 * Status badge palette (info / success / warning / error).
 */
export interface ZpressBadgeColors {
  readonly info: ZpressBadgeColor
  readonly success: ZpressBadgeColor
  readonly warning: ZpressBadgeColor
  readonly error: ZpressBadgeColor
}

/**
 * Scrollbar colors.
 */
export interface ZpressScrollbarColors {
  readonly thumb: string
  readonly thumbHover: string
}

/**
 * Syntax highlighting tokens.
 */
export interface ZpressSyntaxColors {
  readonly kw: string
  readonly str: string
  readonly fn: string
}

/**
 * Gradient stop colors (the cyan + purple stops used in the hero-title gradient).
 */
export interface ZpressGradientColors {
  readonly heroCyan: string
  readonly heroPurple: string
}

/**
 * OpenAPI / OAS method + state badge colors. Maps to `--zp-oas-*` CSS vars.
 */
export interface ZpressOasColors {
  readonly get: string
  readonly post: string
  readonly put: string
  readonly patch: string
  readonly delete: string
  readonly deprecated: string
  readonly required: string
}

/**
 * Brand button surface colors — used by primary CTAs across the docs site.
 */
export interface ZpressButtonBrandColors {
  readonly bg: string
  readonly hoverBg: string
  readonly activeBg: string
  readonly text: string
}

/**
 * Button color sub-shape — currently exposes the brand button surface.
 */
export interface ZpressButtonColors {
  readonly brand: ZpressButtonBrandColors
}

/**
 * Full color sub-shape of `ZpressTokens`.
 */
export interface ZpressColors {
  readonly brand: ZpressBrandColors
  readonly semantic: ZpressSemanticColors
  readonly surface: ZpressSurfaceColors
  readonly text: ZpressTextColors
  readonly border: ZpressBorderColors
  readonly tint: ZpressTintColors
  readonly terminal: ZpressTerminalColors
  readonly window: ZpressWindowColors
  readonly badge: ZpressBadgeColors
  readonly scrollbar: ZpressScrollbarColors
  readonly syntax: ZpressSyntaxColors
  readonly gradient: ZpressGradientColors
  readonly oas: ZpressOasColors
  readonly button: ZpressButtonColors
}

/**
 * Spacing scale — a 2-px grid covering every padding/margin/gap value seen
 * in the audit.
 */
export interface ZpressSpacing {
  readonly s1: string
  readonly s2: string
  readonly s3: string
  readonly s4: string
  readonly s5: string
  readonly s6: string
  readonly s8: string
  readonly s10: string
  readonly s12: string
  readonly s14: string
  readonly s16: string
  readonly s18: string
  readonly s20: string
  readonly s24: string
  readonly s28: string
  readonly s32: string
  readonly s40: string
  readonly s48: string
  readonly s56: string
  readonly s64: string
  readonly s72: string
  readonly s96: string
}

/**
 * Border-radius scale.
 */
export interface ZpressRadii {
  readonly xs: string
  readonly xsSm: string
  readonly sm: string
  readonly mdSm: string
  readonly md: string
  readonly lg: string
  readonly mdLg: string
  readonly pill: string
}

/**
 * Font-family stack.
 */
export interface ZpressFontFamilies {
  readonly sans: string
  readonly mono: string
}

/**
 * Font-weight scale.
 */
export interface ZpressFontWeights {
  readonly regular: number
  readonly medium: number
  readonly semibold: number
  readonly bold: number
}

/**
 * Font-size scale — generic body + named slots for every component-specific
 * font-size flagged in the audit.
 */
export interface ZpressFontSizes {
  readonly body: string
  readonly btn: string
  readonly bullet: string
  readonly code: string
  readonly eyebrow: string
  readonly tagline: string
  readonly heroTitle: string
  readonly splitTitle: string
  readonly featureTitle: string
  readonly featureDesc: string
  readonly featureLink: string
  readonly sectionTitle: string
  readonly sectionDesc: string
  readonly badge: string
  readonly tooltip: string
  readonly tooltipHeadline: string
  readonly tooltipCta: string
  readonly check: string
  readonly fieldName: string
  readonly fieldType: string
  readonly fieldBadge: string
  readonly fieldDefault: string
  readonly fieldDefaultCode: string
  readonly fieldBody: string
  readonly fieldGroupTitle: string
  readonly fieldTrigger: string
  readonly promptDesc: string
  readonly promptFeedback: string
  readonly promptBtn: string
  readonly promptMenuItem: string
  readonly promptMenuDesc: string
  readonly colorName: string
  readonly colorValue: string
  readonly windowTitle: string
  readonly windowTab: string
  readonly windowUrl: string
  readonly termBody: string
  readonly demoTitle: string
  readonly demoBody: string
  readonly askAi: string
  readonly askAiMark: string
  readonly askAiShortcut: string
  readonly sidebarLink: string
}

/**
 * Full font sub-shape of `ZpressTokens`.
 */
export interface ZpressFonts {
  readonly family: ZpressFontFamilies
  readonly weight: ZpressFontWeights
  readonly size: ZpressFontSizes
}

/**
 * Box-shadow recipes.
 */
export interface ZpressShadows {
  readonly cardHover: string
  readonly menu: string
  readonly tooltip: string
  readonly heroDemo: string
  readonly askAi: string
}

/**
 * Motion durations.
 */
export interface ZpressMotionDurations {
  readonly fast: string
  readonly base: string
}

/**
 * Motion easings.
 */
export interface ZpressMotionEasings {
  readonly base: string
}

/**
 * Motion sub-shape of `ZpressTokens` (durations + easings).
 */
export interface ZpressMotion {
  readonly duration: ZpressMotionDurations
  readonly easing: ZpressMotionEasings
}

/**
 * Z-index scale.
 */
export interface ZpressZIndex {
  readonly dropdown: number
  readonly floating: number
  readonly tooltip: number
}

/**
 * Line-height scale (display through code).
 */
export interface ZpressLineHeights {
  readonly display: string
  readonly tight: string
  readonly tighter: string
  readonly snug: string
  readonly base: string
  readonly relaxed: string
  readonly demo: string
  readonly code: string
  readonly sidebar: string
}

/**
 * Letter-spacing scale.
 */
export interface ZpressLetterSpacings {
  readonly wide: string
  readonly eyebrow: string
  readonly display: string
  readonly hero: string
}

/**
 * Opacity tokens.
 */
export interface ZpressOpacities {
  readonly muted: string
  readonly deprecated: string
  readonly hover: string
}

/**
 * Component / element sizes that aren't pure spacing.
 */
export interface ZpressSizes {
  readonly titlebar: string
  readonly windowDot: string
  readonly windowTabDot: string
  readonly browserTabMax: string
  readonly browserIcon: string
  readonly browserUrlbar: string
  readonly iconBox: string
  readonly iconBoxSm: string
  readonly iconSvg: string
  readonly iconSvgSm: string
  readonly iconSm: string
  readonly contentMax: string
  readonly focusRing: string
  readonly focusRingOffset: string
  readonly tooltipMax: string
  readonly swatch: string
  readonly demoMax: string
  readonly splitMax: string
  readonly heroGrid: string
  readonly heroMax: string
  readonly taglineMax: string
  readonly promptIcon: string
  readonly promptBtn: string
  readonly menuMin: string
  readonly promptMenuIcon: string
  readonly check: string
  readonly chevron: string
  readonly askAiIcon: string
  readonly sidebarCircle: string
  readonly scrollbar: string
}

/**
 * Breakpoint widths (max-width media queries).
 */
export interface ZpressBreakpoints {
  readonly sm: string
  readonly md: string
  readonly mdLg: string
  readonly content: string
}

/**
 * Backdrop blur scale.
 */
export interface ZpressBlurs {
  readonly base: string
}

/**
 * Pre-composed gradient tokens (brand + hero-title).
 */
export interface ZpressGradients {
  readonly brand: string
  readonly heroTitle: string
}

/**
 * Top-level token shape — every key here maps to one or more `--zp-*` CSS
 * custom properties via `TOKEN_TO_CSS_VAR`.
 *
 * @example
 * const css = `padding: ${TOKEN_TO_CSS_VAR['spacing.s16']};`
 * // => `padding: var(--zp-s-16);`
 */
export interface ZpressTokens {
  readonly colors: ZpressColors
  readonly spacing: ZpressSpacing
  readonly radii: ZpressRadii
  readonly fonts: ZpressFonts
  readonly shadows: ZpressShadows
  readonly motion: ZpressMotion
  readonly zIndex: ZpressZIndex
  readonly lineHeights: ZpressLineHeights
  readonly letterSpacings: ZpressLetterSpacings
  readonly opacities: ZpressOpacities
  readonly sizes: ZpressSizes
  readonly breakpoints: ZpressBreakpoints
  readonly blurs: ZpressBlurs
  readonly gradients: ZpressGradients
}

/**
 * String literal union of every leaf token path in `ZpressTokens`.
 * Path segments are joined with `.` and ordered from outer to inner key.
 */
export type TokenPath =
  // colors.brand
  | 'colors.brand.primary'
  | 'colors.brand.hover'
  | 'colors.brand.active'
  | 'colors.brand.fg'
  | 'colors.brand.soft'
  | 'colors.brand.onBrand'
  | 'colors.brand.light'
  | 'colors.brand.lighter'
  // colors.semantic
  | 'colors.semantic.success'
  | 'colors.semantic.error'
  | 'colors.semantic.warn'
  | 'colors.semantic.info'
  | 'colors.semantic.muted'
  // colors.surface
  | 'colors.surface.bg'
  | 'colors.surface.bgAlt'
  | 'colors.surface.bgElv'
  | 'colors.surface.bgSoft'
  | 'colors.surface.bgIcon'
  | 'colors.surface.homeBg'
  | 'colors.surface.overlayFaint'
  | 'colors.surface.gutter'
  | 'colors.surface.codeBlockBg'
  // colors.text
  | 'colors.text.text1'
  | 'colors.text.text2'
  | 'colors.text.text3'
  // colors.border
  | 'colors.border.border'
  | 'colors.border.divider'
  | 'colors.border.sidebarAltBorderDark'
  // colors.tint
  | 'colors.tint.purple.bg'
  | 'colors.tint.purple.fg'
  | 'colors.tint.blue.bg'
  | 'colors.tint.blue.fg'
  | 'colors.tint.green.bg'
  | 'colors.tint.green.fg'
  | 'colors.tint.amber.bg'
  | 'colors.tint.amber.fg'
  | 'colors.tint.red.bg'
  | 'colors.tint.red.fg'
  | 'colors.tint.slate.bg'
  | 'colors.tint.slate.fg'
  | 'colors.tint.cyan.bg'
  | 'colors.tint.cyan.fg'
  | 'colors.tint.pink.bg'
  | 'colors.tint.pink.fg'
  | 'colors.tint.purpleBright.fg'
  | 'colors.tint.amberBright.fg'
  | 'colors.tint.purpleGlow'
  // colors.terminal
  | 'colors.terminal.bg'
  | 'colors.terminal.titlebarBg'
  | 'colors.terminal.border'
  | 'colors.terminal.title'
  | 'colors.terminal.text'
  | 'colors.terminal.promptPrefix'
  | 'colors.terminal.output'
  | 'colors.terminal.red'
  | 'colors.terminal.green'
  | 'colors.terminal.blue'
  | 'colors.terminal.yellow'
  | 'colors.terminal.cyan'
  | 'colors.terminal.magenta'
  | 'colors.terminal.white'
  | 'colors.terminal.gray'
  | 'colors.terminal.success'
  | 'colors.terminal.error'
  | 'colors.terminal.warn'
  | 'colors.terminal.info'
  | 'colors.terminal.muted'
  | 'colors.terminal.bar'
  | 'colors.terminal.step'
  // colors.window
  | 'colors.window.dotClose'
  | 'colors.window.dotMinimize'
  | 'colors.window.dotMaximize'
  | 'colors.window.titleFallback'
  // colors.badge
  | 'colors.badge.info.bg'
  | 'colors.badge.info.fg'
  | 'colors.badge.success.bg'
  | 'colors.badge.success.fg'
  | 'colors.badge.warning.bg'
  | 'colors.badge.warning.fg'
  | 'colors.badge.error.bg'
  | 'colors.badge.error.fg'
  // colors.scrollbar
  | 'colors.scrollbar.thumb'
  | 'colors.scrollbar.thumbHover'
  // colors.syntax
  | 'colors.syntax.kw'
  | 'colors.syntax.str'
  | 'colors.syntax.fn'
  // colors.gradient
  | 'colors.gradient.heroCyan'
  | 'colors.gradient.heroPurple'
  // colors.oas
  | 'colors.oas.get'
  | 'colors.oas.post'
  | 'colors.oas.put'
  | 'colors.oas.patch'
  | 'colors.oas.delete'
  | 'colors.oas.deprecated'
  | 'colors.oas.required'
  // colors.button
  | 'colors.button.brand.bg'
  | 'colors.button.brand.hoverBg'
  | 'colors.button.brand.activeBg'
  | 'colors.button.brand.text'
  // spacing
  | 'spacing.s1'
  | 'spacing.s2'
  | 'spacing.s3'
  | 'spacing.s4'
  | 'spacing.s5'
  | 'spacing.s6'
  | 'spacing.s8'
  | 'spacing.s10'
  | 'spacing.s12'
  | 'spacing.s14'
  | 'spacing.s16'
  | 'spacing.s18'
  | 'spacing.s20'
  | 'spacing.s24'
  | 'spacing.s28'
  | 'spacing.s32'
  | 'spacing.s40'
  | 'spacing.s48'
  | 'spacing.s56'
  | 'spacing.s64'
  | 'spacing.s72'
  | 'spacing.s96'
  // radii
  | 'radii.xs'
  | 'radii.xsSm'
  | 'radii.sm'
  | 'radii.mdSm'
  | 'radii.md'
  | 'radii.lg'
  | 'radii.mdLg'
  | 'radii.pill'
  // fonts.family
  | 'fonts.family.sans'
  | 'fonts.family.mono'
  // fonts.weight
  | 'fonts.weight.regular'
  | 'fonts.weight.medium'
  | 'fonts.weight.semibold'
  | 'fonts.weight.bold'
  // fonts.size
  | 'fonts.size.body'
  | 'fonts.size.btn'
  | 'fonts.size.bullet'
  | 'fonts.size.code'
  | 'fonts.size.eyebrow'
  | 'fonts.size.tagline'
  | 'fonts.size.heroTitle'
  | 'fonts.size.splitTitle'
  | 'fonts.size.featureTitle'
  | 'fonts.size.featureDesc'
  | 'fonts.size.featureLink'
  | 'fonts.size.sectionTitle'
  | 'fonts.size.sectionDesc'
  | 'fonts.size.badge'
  | 'fonts.size.tooltip'
  | 'fonts.size.tooltipHeadline'
  | 'fonts.size.tooltipCta'
  | 'fonts.size.check'
  | 'fonts.size.fieldName'
  | 'fonts.size.fieldType'
  | 'fonts.size.fieldBadge'
  | 'fonts.size.fieldDefault'
  | 'fonts.size.fieldDefaultCode'
  | 'fonts.size.fieldBody'
  | 'fonts.size.fieldGroupTitle'
  | 'fonts.size.fieldTrigger'
  | 'fonts.size.promptDesc'
  | 'fonts.size.promptFeedback'
  | 'fonts.size.promptBtn'
  | 'fonts.size.promptMenuItem'
  | 'fonts.size.promptMenuDesc'
  | 'fonts.size.colorName'
  | 'fonts.size.colorValue'
  | 'fonts.size.windowTitle'
  | 'fonts.size.windowTab'
  | 'fonts.size.windowUrl'
  | 'fonts.size.termBody'
  | 'fonts.size.demoTitle'
  | 'fonts.size.demoBody'
  | 'fonts.size.askAi'
  | 'fonts.size.askAiMark'
  | 'fonts.size.askAiShortcut'
  | 'fonts.size.sidebarLink'
  // shadows
  | 'shadows.cardHover'
  | 'shadows.menu'
  | 'shadows.tooltip'
  | 'shadows.heroDemo'
  | 'shadows.askAi'
  // motion.duration
  | 'motion.duration.fast'
  | 'motion.duration.base'
  // motion.easing
  | 'motion.easing.base'
  // zIndex
  | 'zIndex.dropdown'
  | 'zIndex.floating'
  | 'zIndex.tooltip'
  // lineHeights
  | 'lineHeights.display'
  | 'lineHeights.tight'
  | 'lineHeights.tighter'
  | 'lineHeights.snug'
  | 'lineHeights.base'
  | 'lineHeights.relaxed'
  | 'lineHeights.demo'
  | 'lineHeights.code'
  | 'lineHeights.sidebar'
  // letterSpacings
  | 'letterSpacings.wide'
  | 'letterSpacings.eyebrow'
  | 'letterSpacings.display'
  | 'letterSpacings.hero'
  // opacities
  | 'opacities.muted'
  | 'opacities.deprecated'
  | 'opacities.hover'
  // sizes
  | 'sizes.titlebar'
  | 'sizes.windowDot'
  | 'sizes.windowTabDot'
  | 'sizes.browserTabMax'
  | 'sizes.browserIcon'
  | 'sizes.browserUrlbar'
  | 'sizes.iconBox'
  | 'sizes.iconBoxSm'
  | 'sizes.iconSvg'
  | 'sizes.iconSvgSm'
  | 'sizes.iconSm'
  | 'sizes.contentMax'
  | 'sizes.focusRing'
  | 'sizes.focusRingOffset'
  | 'sizes.tooltipMax'
  | 'sizes.swatch'
  | 'sizes.demoMax'
  | 'sizes.splitMax'
  | 'sizes.heroGrid'
  | 'sizes.heroMax'
  | 'sizes.taglineMax'
  | 'sizes.promptIcon'
  | 'sizes.promptBtn'
  | 'sizes.menuMin'
  | 'sizes.promptMenuIcon'
  | 'sizes.check'
  | 'sizes.chevron'
  | 'sizes.askAiIcon'
  | 'sizes.sidebarCircle'
  | 'sizes.scrollbar'
  // breakpoints
  | 'breakpoints.sm'
  | 'breakpoints.md'
  | 'breakpoints.mdLg'
  | 'breakpoints.content'
  // blurs
  | 'blurs.base'
  // gradients
  | 'gradients.brand'
  | 'gradients.heroTitle'

/**
 * Canonical mapping from every `ZpressTokens` leaf path to its `--zp-*`
 * CSS custom-property name. Every key in `ZpressTokens` MUST appear here
 * exactly once, and every value MUST be unique.
 *
 * Naming follows the conventions documented at the top of this file and
 * matches the `--zp-*` names proposed in `.snapshots/baseline/token-audit.txt`.
 */
export const TOKEN_TO_CSS_VAR: Readonly<Record<TokenPath, string>> = Object.freeze({
  // colors.brand
  'colors.brand.primary': '--zp-c-brand-1',
  'colors.brand.hover': '--zp-c-brand-2',
  'colors.brand.active': '--zp-c-brand-3',
  'colors.brand.fg': '--zp-c-brand-fg',
  'colors.brand.soft': '--zp-c-brand-soft',
  'colors.brand.onBrand': '--zp-c-on-brand',
  'colors.brand.light': '--zp-c-brand-light',
  'colors.brand.lighter': '--zp-c-brand-lighter',
  // colors.semantic
  'colors.semantic.success': '--zp-c-success',
  'colors.semantic.error': '--zp-c-error',
  'colors.semantic.warn': '--zp-c-warn',
  'colors.semantic.info': '--zp-c-info',
  'colors.semantic.muted': '--zp-c-muted',
  // colors.surface
  'colors.surface.bg': '--zp-c-bg',
  'colors.surface.bgAlt': '--zp-c-bg-alt',
  'colors.surface.bgElv': '--zp-c-bg-elv',
  'colors.surface.bgSoft': '--zp-c-bg-soft',
  'colors.surface.bgIcon': '--zp-c-bg-icon',
  'colors.surface.homeBg': '--zp-c-home-bg',
  'colors.surface.overlayFaint': '--zp-c-overlay-faint',
  'colors.surface.gutter': '--zp-c-gutter',
  'colors.surface.codeBlockBg': '--zp-code-block-bg',
  // colors.text
  'colors.text.text1': '--zp-c-text-1',
  'colors.text.text2': '--zp-c-text-2',
  'colors.text.text3': '--zp-c-text-3',
  // colors.border
  'colors.border.border': '--zp-c-border',
  'colors.border.divider': '--zp-c-divider',
  'colors.border.sidebarAltBorderDark': '--zp-c-sidebar-alt-border-dark',
  // colors.tint
  'colors.tint.purple.bg': '--zp-c-tint-purple-bg',
  'colors.tint.purple.fg': '--zp-c-tint-purple-fg',
  'colors.tint.blue.bg': '--zp-c-tint-blue-bg',
  'colors.tint.blue.fg': '--zp-c-tint-blue-fg',
  'colors.tint.green.bg': '--zp-c-tint-green-bg',
  'colors.tint.green.fg': '--zp-c-tint-green-fg',
  'colors.tint.amber.bg': '--zp-c-tint-amber-bg',
  'colors.tint.amber.fg': '--zp-c-tint-amber-fg',
  'colors.tint.red.bg': '--zp-c-tint-red-bg',
  'colors.tint.red.fg': '--zp-c-tint-red-fg',
  'colors.tint.slate.bg': '--zp-c-tint-slate-bg',
  'colors.tint.slate.fg': '--zp-c-tint-slate-fg',
  'colors.tint.cyan.bg': '--zp-c-tint-cyan-bg',
  'colors.tint.cyan.fg': '--zp-c-tint-cyan-fg',
  'colors.tint.pink.bg': '--zp-c-tint-pink-bg',
  'colors.tint.pink.fg': '--zp-c-tint-pink-fg',
  'colors.tint.purpleBright.fg': '--zp-c-tint-purple-bright-fg',
  'colors.tint.amberBright.fg': '--zp-c-tint-amber-bright-fg',
  'colors.tint.purpleGlow': '--zp-c-tint-purple-glow',
  // colors.terminal
  'colors.terminal.bg': '--zp-c-term-bg',
  'colors.terminal.titlebarBg': '--zp-c-term-titlebar-bg',
  'colors.terminal.border': '--zp-c-term-border',
  'colors.terminal.title': '--zp-c-term-title',
  'colors.terminal.text': '--zp-c-term-text',
  'colors.terminal.promptPrefix': '--zp-c-term-prompt-prefix',
  'colors.terminal.output': '--zp-c-term-output',
  'colors.terminal.red': '--zp-c-term-red',
  'colors.terminal.green': '--zp-c-term-green',
  'colors.terminal.blue': '--zp-c-term-blue',
  'colors.terminal.yellow': '--zp-c-term-yellow',
  'colors.terminal.cyan': '--zp-c-term-cyan',
  'colors.terminal.magenta': '--zp-c-term-magenta',
  'colors.terminal.white': '--zp-c-term-white',
  'colors.terminal.gray': '--zp-c-term-gray',
  'colors.terminal.success': '--zp-c-term-success',
  'colors.terminal.error': '--zp-c-term-error',
  'colors.terminal.warn': '--zp-c-term-warn',
  'colors.terminal.info': '--zp-c-term-info',
  'colors.terminal.muted': '--zp-c-term-muted',
  'colors.terminal.bar': '--zp-c-term-bar',
  'colors.terminal.step': '--zp-c-term-step',
  // colors.window
  'colors.window.dotClose': '--zp-c-window-dot-close',
  'colors.window.dotMinimize': '--zp-c-window-dot-minimize',
  'colors.window.dotMaximize': '--zp-c-window-dot-maximize',
  'colors.window.titleFallback': '--zp-c-window-title-fallback',
  // colors.badge
  'colors.badge.info.bg': '--zp-c-badge-info-bg',
  'colors.badge.info.fg': '--zp-c-badge-info-fg',
  'colors.badge.success.bg': '--zp-c-badge-success-bg',
  'colors.badge.success.fg': '--zp-c-badge-success-fg',
  'colors.badge.warning.bg': '--zp-c-badge-warning-bg',
  'colors.badge.warning.fg': '--zp-c-badge-warning-fg',
  'colors.badge.error.bg': '--zp-c-badge-error-bg',
  'colors.badge.error.fg': '--zp-c-badge-error-fg',
  // colors.scrollbar
  'colors.scrollbar.thumb': '--zp-c-scrollbar-thumb',
  'colors.scrollbar.thumbHover': '--zp-c-scrollbar-thumb-hover',
  // colors.syntax
  'colors.syntax.kw': '--zp-c-syntax-kw',
  'colors.syntax.str': '--zp-c-syntax-str',
  'colors.syntax.fn': '--zp-c-syntax-fn',
  // colors.gradient
  'colors.gradient.heroCyan': '--zp-c-gradient-hero-cyan',
  'colors.gradient.heroPurple': '--zp-c-gradient-hero-purple',
  // colors.oas
  'colors.oas.get': '--zp-oas-get',
  'colors.oas.post': '--zp-oas-post',
  'colors.oas.put': '--zp-oas-put',
  'colors.oas.patch': '--zp-oas-patch',
  'colors.oas.delete': '--zp-oas-delete',
  'colors.oas.deprecated': '--zp-oas-deprecated',
  'colors.oas.required': '--zp-oas-required',
  // colors.button
  'colors.button.brand.bg': '--zp-button-brand-bg',
  'colors.button.brand.hoverBg': '--zp-button-brand-hover-bg',
  'colors.button.brand.activeBg': '--zp-button-brand-active-bg',
  'colors.button.brand.text': '--zp-button-brand-text',
  // spacing
  'spacing.s1': '--zp-s-1',
  'spacing.s2': '--zp-s-2',
  'spacing.s3': '--zp-s-3',
  'spacing.s4': '--zp-s-4',
  'spacing.s5': '--zp-s-5',
  'spacing.s6': '--zp-s-6',
  'spacing.s8': '--zp-s-8',
  'spacing.s10': '--zp-s-10',
  'spacing.s12': '--zp-s-12',
  'spacing.s14': '--zp-s-14',
  'spacing.s16': '--zp-s-16',
  'spacing.s18': '--zp-s-18',
  'spacing.s20': '--zp-s-20',
  'spacing.s24': '--zp-s-24',
  'spacing.s28': '--zp-s-28',
  'spacing.s32': '--zp-s-32',
  'spacing.s40': '--zp-s-40',
  'spacing.s48': '--zp-s-48',
  'spacing.s56': '--zp-s-56',
  'spacing.s64': '--zp-s-64',
  'spacing.s72': '--zp-s-72',
  'spacing.s96': '--zp-s-96',
  // radii
  'radii.xs': '--zp-radius-xs',
  'radii.xsSm': '--zp-radius-xs-sm',
  'radii.sm': '--zp-radius-sm',
  'radii.mdSm': '--zp-radius-md-sm',
  'radii.md': '--zp-radius-md',
  'radii.lg': '--zp-radius-lg',
  'radii.mdLg': '--zp-radius-md-lg',
  'radii.pill': '--zp-radius-pill',
  // fonts.family
  'fonts.family.sans': '--zp-ff-sans',
  'fonts.family.mono': '--zp-ff-mono',
  // fonts.weight
  'fonts.weight.regular': '--zp-fw-regular',
  'fonts.weight.medium': '--zp-fw-medium',
  'fonts.weight.semibold': '--zp-fw-semibold',
  'fonts.weight.bold': '--zp-fw-bold',
  // fonts.size
  'fonts.size.body': '--zp-fs-body',
  'fonts.size.btn': '--zp-fs-btn',
  'fonts.size.bullet': '--zp-fs-bullet',
  'fonts.size.code': '--zp-fs-code',
  'fonts.size.eyebrow': '--zp-fs-eyebrow',
  'fonts.size.tagline': '--zp-fs-tagline',
  'fonts.size.heroTitle': '--zp-fs-hero-title',
  'fonts.size.splitTitle': '--zp-fs-split-title',
  'fonts.size.featureTitle': '--zp-fs-feature-title',
  'fonts.size.featureDesc': '--zp-fs-feature-desc',
  'fonts.size.featureLink': '--zp-fs-feature-link',
  'fonts.size.sectionTitle': '--zp-fs-section-title',
  'fonts.size.sectionDesc': '--zp-fs-section-desc',
  'fonts.size.badge': '--zp-fs-badge',
  'fonts.size.tooltip': '--zp-fs-tooltip',
  'fonts.size.tooltipHeadline': '--zp-fs-tooltip-headline',
  'fonts.size.tooltipCta': '--zp-fs-tooltip-cta',
  'fonts.size.check': '--zp-fs-check',
  'fonts.size.fieldName': '--zp-fs-field-name',
  'fonts.size.fieldType': '--zp-fs-field-type',
  'fonts.size.fieldBadge': '--zp-fs-field-badge',
  'fonts.size.fieldDefault': '--zp-fs-field-default',
  'fonts.size.fieldDefaultCode': '--zp-fs-field-default-code',
  'fonts.size.fieldBody': '--zp-fs-field-body',
  'fonts.size.fieldGroupTitle': '--zp-fs-field-group-title',
  'fonts.size.fieldTrigger': '--zp-fs-field-trigger',
  'fonts.size.promptDesc': '--zp-fs-prompt-desc',
  'fonts.size.promptFeedback': '--zp-fs-prompt-feedback',
  'fonts.size.promptBtn': '--zp-fs-prompt-btn',
  'fonts.size.promptMenuItem': '--zp-fs-prompt-menu-item',
  'fonts.size.promptMenuDesc': '--zp-fs-prompt-menu-desc',
  'fonts.size.colorName': '--zp-fs-color-name',
  'fonts.size.colorValue': '--zp-fs-color-value',
  'fonts.size.windowTitle': '--zp-fs-window-title',
  'fonts.size.windowTab': '--zp-fs-window-tab',
  'fonts.size.windowUrl': '--zp-fs-window-url',
  'fonts.size.termBody': '--zp-fs-term-body',
  'fonts.size.demoTitle': '--zp-fs-demo-title',
  'fonts.size.demoBody': '--zp-fs-demo-body',
  'fonts.size.askAi': '--zp-fs-ask-ai',
  'fonts.size.askAiMark': '--zp-fs-ask-ai-mark',
  'fonts.size.askAiShortcut': '--zp-fs-ask-ai-shortcut',
  'fonts.size.sidebarLink': '--zp-fs-sidebar-link',
  // shadows
  'shadows.cardHover': '--zp-shadow-card-hover',
  'shadows.menu': '--zp-shadow-menu',
  'shadows.tooltip': '--zp-shadow-tooltip',
  'shadows.heroDemo': '--zp-shadow-hero-demo',
  'shadows.askAi': '--zp-shadow-ask-ai',
  // motion
  'motion.duration.fast': '--zp-duration-fast',
  'motion.duration.base': '--zp-duration-base',
  'motion.easing.base': '--zp-ease-base',
  // zIndex
  'zIndex.dropdown': '--zp-z-dropdown',
  'zIndex.floating': '--zp-z-floating',
  'zIndex.tooltip': '--zp-z-tooltip',
  // lineHeights
  'lineHeights.display': '--zp-lh-display',
  'lineHeights.tight': '--zp-lh-tight',
  'lineHeights.tighter': '--zp-lh-tighter',
  'lineHeights.snug': '--zp-lh-snug',
  'lineHeights.base': '--zp-lh-base',
  'lineHeights.relaxed': '--zp-lh-relaxed',
  'lineHeights.demo': '--zp-lh-demo',
  'lineHeights.code': '--zp-lh-code',
  'lineHeights.sidebar': '--zp-lh-sidebar',
  // letterSpacings
  'letterSpacings.wide': '--zp-letter-wide',
  'letterSpacings.eyebrow': '--zp-letter-eyebrow',
  'letterSpacings.display': '--zp-letter-display',
  'letterSpacings.hero': '--zp-letter-hero',
  // opacities
  'opacities.muted': '--zp-opacity-muted',
  'opacities.deprecated': '--zp-opacity-deprecated',
  'opacities.hover': '--zp-opacity-hover',
  // sizes
  'sizes.titlebar': '--zp-size-titlebar',
  'sizes.windowDot': '--zp-size-window-dot',
  'sizes.windowTabDot': '--zp-size-window-tab-dot',
  'sizes.browserTabMax': '--zp-size-browser-tab-max',
  'sizes.browserIcon': '--zp-size-browser-icon',
  'sizes.browserUrlbar': '--zp-size-browser-urlbar',
  'sizes.iconBox': '--zp-size-icon-box',
  'sizes.iconBoxSm': '--zp-size-icon-box-sm',
  'sizes.iconSvg': '--zp-size-icon-svg',
  'sizes.iconSvgSm': '--zp-size-icon-svg-sm',
  'sizes.iconSm': '--zp-size-icon-sm',
  'sizes.contentMax': '--zp-size-content-max',
  'sizes.focusRing': '--zp-size-focus-ring',
  'sizes.focusRingOffset': '--zp-size-focus-ring-offset',
  'sizes.tooltipMax': '--zp-size-tooltip-max',
  'sizes.swatch': '--zp-size-swatch',
  'sizes.demoMax': '--zp-size-demo-max',
  'sizes.splitMax': '--zp-size-split-max',
  'sizes.heroGrid': '--zp-size-hero-grid',
  'sizes.heroMax': '--zp-size-hero-max',
  'sizes.taglineMax': '--zp-size-tagline-max',
  'sizes.promptIcon': '--zp-size-prompt-icon',
  'sizes.promptBtn': '--zp-size-prompt-btn',
  'sizes.menuMin': '--zp-size-menu-min',
  'sizes.promptMenuIcon': '--zp-size-prompt-menu-icon',
  'sizes.check': '--zp-size-check',
  'sizes.chevron': '--zp-size-chevron',
  'sizes.askAiIcon': '--zp-size-ask-ai-icon',
  'sizes.sidebarCircle': '--zp-size-sidebar-circle',
  'sizes.scrollbar': '--zp-size-scrollbar',
  // breakpoints
  'breakpoints.sm': '--zp-bp-sm',
  'breakpoints.md': '--zp-bp-md',
  'breakpoints.mdLg': '--zp-bp-md-lg',
  'breakpoints.content': '--zp-bp-content',
  // blurs
  'blurs.base': '--zp-blur-base',
  // gradients
  'gradients.brand': '--zp-gradient-brand',
  'gradients.heroTitle': '--zp-gradient-hero-title',
})
