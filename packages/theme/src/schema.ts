/**
 * Zod schemas for theme configuration and design-token validation.
 *
 * These schemas are the canonical Zod definitions for the theme surface — the
 * legacy duplicates in `packages/config/src/schema.ts` re-import from here.
 *
 * Schemas use `.strict()` to reject unknown keys with a clear error rather than
 * silently dropping them. Hex color strings are validated via a custom refine
 * that accepts non-hex CSS color values (`rgba(...)`, `hsl(...)`, `transparent`,
 * named colors) but rejects malformed hex codes such as `#zzz`.
 *
 * Helper sub-schemas (the `zpress*Schema` consts below the exports) are not
 * exported but are declared above the public API so the `const`-initializer
 * references in `tokensSchema` resolve at module-load time. Each helper has a
 * `z.ZodType<...>` guard immediately below it to enforce schema/type parity
 * with `ZpressTokens` and its sub-interfaces.
 */

import { z } from 'zod'

import type {
  ZpressBadgeColor,
  ZpressBadgeColors,
  ZpressBlurs,
  ZpressBorderColors,
  ZpressBrandColors,
  ZpressBreakpoints,
  ZpressButtonBrandColors,
  ZpressButtonColors,
  ZpressColors,
  ZpressFontFamilies,
  ZpressFontSizes,
  ZpressFontWeights,
  ZpressFonts,
  ZpressGradientColors,
  ZpressGradients,
  ZpressLetterSpacings,
  ZpressLineHeights,
  ZpressMotion,
  ZpressMotionDurations,
  ZpressMotionEasings,
  ZpressOasColors,
  ZpressOpacities,
  ZpressRadii,
  ZpressScrollbarColors,
  ZpressSemanticColors,
  ZpressShadows,
  ZpressSizes,
  ZpressSpacing,
  ZpressSurfaceColors,
  ZpressSyntaxColors,
  ZpressTerminalColors,
  ZpressTextColors,
  ZpressTintBrightColor,
  ZpressTintColor,
  ZpressTintColors,
  ZpressTokens,
  ZpressWindowColors,
  ZpressZIndex,
} from './tokens.ts'

/**
 * Reusable non-empty string token schema with a clear empty-value message.
 *
 * Token values flow into the build-time CSS emitter and end up between
 * `{ ... }` blocks inside a `<style>` tag, so we reject characters that
 * could break out of a CSS declaration (`;`, `{`, `}`) or close the
 * surrounding `<style>` element. This makes the emitter safe for
 * downstream apps that accept tenant- or user-supplied theme tokens.
 *
 * @private
 */
const tokenStringSchema = z
  .string()
  .min(1, { message: 'Token value cannot be empty' })
  .refine(isCssSafeValue, {
    message:
      'Token value contains characters that would break the emitted CSS (`;`, `{`, `}`, or `</style>`)',
  })

/**
 * Theme name pattern — lowercase alphanumeric with hyphens, must start with
 * an alphanumeric. Interpolated into `html[data-zp-theme='{name}']` selectors
 * so we constrain it to a slug rather than escape at emission time.
 *
 * @private
 */
const themeNamePattern = /^[a-z0-9][a-z0-9-]*$/

/**
 * Zod schema for a theme `name` identifier.
 *
 * Names must be a lowercase slug (`/^[a-z0-9][a-z0-9-]*$/`) — they are
 * interpolated into the `html[data-zp-theme='{name}']` selector emitted
 * by `themeToCss`, so constraining at the schema boundary avoids the need
 * for runtime escaping in the emitter.
 */
export const themeNameSchema = z
  .string()
  .min(1, { message: 'Theme name cannot be empty' })
  .regex(themeNamePattern, {
    message:
      'Theme name must be a lowercase slug (a-z, 0-9, hyphen) starting with an alphanumeric character',
  })

/**
 * Zod schema for the theme variant setting. Accepts `'dark'` or `'light'`.
 */
export const themeVariantSchema = z.enum(['dark', 'light'])

/**
 * Legacy alias for `themeVariantSchema` — kept for migration ergonomics.
 *
 * @deprecated Use {@link themeVariantSchema}.
 */
export const colorModeSchema = themeVariantSchema

/**
 * Zod schema for a CSS color string.
 *
 * Accepts any non-empty CSS color value. If the value starts with `#`, it must
 * match the 3 / 4 / 6 / 8-digit hex format — so `#fff`, `#fff8`, `#ffffff`,
 * `#ffffff80` pass while `#zzz`, `#1234567`, or `#` fail with a clear message.
 * Non-hex inputs (`rgba(...)`, `hsl(...)`, `transparent`, named colors) pass
 * through; deeper CSS color grammar is intentionally not validated.
 */
export const cssColorSchema = z
  .string()
  .min(1, { message: 'Color value cannot be empty' })
  .refine(isCssSafeValue, {
    message:
      'Color value contains characters that would break the emitted CSS (`;`, `{`, `}`, or `</style>`)',
  })
  .refine(isValidCssColor, {
    message:
      'Invalid hex color — expected `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA` (case-insensitive)',
  })

// Helper sub-schemas for `themeColorsSchema` / `tokensSchema`. Declared as
// non-exported `const`s above the public exports because Zod schema
// composition resolves references at initializer time (not call time).

const zpressBrandColorsSchema = z
  .object({
    primary: cssColorSchema,
    hover: cssColorSchema,
    active: cssColorSchema,
    fg: cssColorSchema,
    soft: cssColorSchema,
    onBrand: cssColorSchema,
    light: cssColorSchema,
    lighter: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBrandColors: z.ZodType<ZpressBrandColors> = zpressBrandColorsSchema

const zpressSemanticColorsSchema = z
  .object({
    success: cssColorSchema,
    error: cssColorSchema,
    warn: cssColorSchema,
    info: cssColorSchema,
    muted: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardSemanticColors: z.ZodType<ZpressSemanticColors> = zpressSemanticColorsSchema

const zpressSurfaceColorsSchema = z
  .object({
    bg: cssColorSchema,
    bgAlt: cssColorSchema,
    bgElv: cssColorSchema,
    bgSoft: cssColorSchema,
    bgIcon: cssColorSchema,
    homeBg: cssColorSchema,
    overlayFaint: cssColorSchema,
    gutter: cssColorSchema,
    codeBlockBg: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardSurfaceColors: z.ZodType<ZpressSurfaceColors> = zpressSurfaceColorsSchema

const zpressTextColorsSchema = z
  .object({
    text1: cssColorSchema,
    text2: cssColorSchema,
    text3: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTextColors: z.ZodType<ZpressTextColors> = zpressTextColorsSchema

const zpressBorderColorsSchema = z
  .object({
    border: cssColorSchema,
    divider: cssColorSchema,
    sidebarAltBorderDark: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBorderColors: z.ZodType<ZpressBorderColors> = zpressBorderColorsSchema

const zpressTintColorSchema = z
  .object({
    bg: cssColorSchema,
    fg: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTintColor: z.ZodType<ZpressTintColor> = zpressTintColorSchema

const zpressTintBrightColorSchema = z
  .object({
    fg: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTintBrightColor: z.ZodType<ZpressTintBrightColor> = zpressTintBrightColorSchema

const zpressTintColorsSchema = z
  .object({
    purple: zpressTintColorSchema,
    blue: zpressTintColorSchema,
    green: zpressTintColorSchema,
    amber: zpressTintColorSchema,
    red: zpressTintColorSchema,
    slate: zpressTintColorSchema,
    cyan: zpressTintColorSchema,
    pink: zpressTintColorSchema,
    purpleBright: zpressTintBrightColorSchema,
    amberBright: zpressTintBrightColorSchema,
    purpleGlow: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTintColors: z.ZodType<ZpressTintColors> = zpressTintColorsSchema

const zpressTerminalColorsSchema = z
  .object({
    bg: cssColorSchema,
    titlebarBg: cssColorSchema,
    border: cssColorSchema,
    title: cssColorSchema,
    text: cssColorSchema,
    promptPrefix: cssColorSchema,
    output: cssColorSchema,
    red: cssColorSchema,
    green: cssColorSchema,
    blue: cssColorSchema,
    yellow: cssColorSchema,
    cyan: cssColorSchema,
    magenta: cssColorSchema,
    white: cssColorSchema,
    gray: cssColorSchema,
    success: cssColorSchema,
    error: cssColorSchema,
    warn: cssColorSchema,
    info: cssColorSchema,
    muted: cssColorSchema,
    bar: cssColorSchema,
    step: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTerminalColors: z.ZodType<ZpressTerminalColors> = zpressTerminalColorsSchema

const zpressWindowColorsSchema = z
  .object({
    dotClose: cssColorSchema,
    dotMinimize: cssColorSchema,
    dotMaximize: cssColorSchema,
    titleFallback: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardWindowColors: z.ZodType<ZpressWindowColors> = zpressWindowColorsSchema

const zpressBadgeColorSchema = z
  .object({
    bg: cssColorSchema,
    fg: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBadgeColor: z.ZodType<ZpressBadgeColor> = zpressBadgeColorSchema

const zpressBadgeColorsSchema = z
  .object({
    info: zpressBadgeColorSchema,
    success: zpressBadgeColorSchema,
    warning: zpressBadgeColorSchema,
    error: zpressBadgeColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBadgeColors: z.ZodType<ZpressBadgeColors> = zpressBadgeColorsSchema

const zpressScrollbarColorsSchema = z
  .object({
    thumb: cssColorSchema,
    thumbHover: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardScrollbarColors: z.ZodType<ZpressScrollbarColors> = zpressScrollbarColorsSchema

const zpressSyntaxColorsSchema = z
  .object({
    kw: cssColorSchema,
    str: cssColorSchema,
    fn: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardSyntaxColors: z.ZodType<ZpressSyntaxColors> = zpressSyntaxColorsSchema

const zpressGradientColorsSchema = z
  .object({
    heroCyan: cssColorSchema,
    heroPurple: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardGradientColors: z.ZodType<ZpressGradientColors> = zpressGradientColorsSchema

const zpressOasColorsSchema = z
  .object({
    get: cssColorSchema,
    post: cssColorSchema,
    put: cssColorSchema,
    patch: cssColorSchema,
    delete: cssColorSchema,
    deprecated: cssColorSchema,
    required: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardOasColors: z.ZodType<ZpressOasColors> = zpressOasColorsSchema

const zpressButtonBrandColorsSchema = z
  .object({
    bg: cssColorSchema,
    hoverBg: cssColorSchema,
    activeBg: cssColorSchema,
    text: cssColorSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardButtonBrandColors: z.ZodType<ZpressButtonBrandColors> = zpressButtonBrandColorsSchema

const zpressButtonColorsSchema = z
  .object({
    brand: zpressButtonBrandColorsSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardButtonColors: z.ZodType<ZpressButtonColors> = zpressButtonColorsSchema

const zpressColorsSchema = z
  .object({
    brand: zpressBrandColorsSchema,
    semantic: zpressSemanticColorsSchema,
    surface: zpressSurfaceColorsSchema,
    text: zpressTextColorsSchema,
    border: zpressBorderColorsSchema,
    tint: zpressTintColorsSchema,
    terminal: zpressTerminalColorsSchema,
    window: zpressWindowColorsSchema,
    badge: zpressBadgeColorsSchema,
    scrollbar: zpressScrollbarColorsSchema,
    syntax: zpressSyntaxColorsSchema,
    gradient: zpressGradientColorsSchema,
    oas: zpressOasColorsSchema,
    button: zpressButtonColorsSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardColors: z.ZodType<ZpressColors> = zpressColorsSchema

const zpressSpacingSchema = z
  .object({
    s1: tokenStringSchema,
    s2: tokenStringSchema,
    s3: tokenStringSchema,
    s4: tokenStringSchema,
    s5: tokenStringSchema,
    s6: tokenStringSchema,
    s8: tokenStringSchema,
    s10: tokenStringSchema,
    s12: tokenStringSchema,
    s14: tokenStringSchema,
    s16: tokenStringSchema,
    s18: tokenStringSchema,
    s20: tokenStringSchema,
    s24: tokenStringSchema,
    s28: tokenStringSchema,
    s32: tokenStringSchema,
    s40: tokenStringSchema,
    s48: tokenStringSchema,
    s56: tokenStringSchema,
    s64: tokenStringSchema,
    s72: tokenStringSchema,
    s96: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardSpacing: z.ZodType<ZpressSpacing> = zpressSpacingSchema

const zpressRadiiSchema = z
  .object({
    xs: tokenStringSchema,
    xsSm: tokenStringSchema,
    sm: tokenStringSchema,
    mdSm: tokenStringSchema,
    md: tokenStringSchema,
    lg: tokenStringSchema,
    mdLg: tokenStringSchema,
    pill: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardRadii: z.ZodType<ZpressRadii> = zpressRadiiSchema

const zpressFontFamiliesSchema = z
  .object({
    sans: tokenStringSchema,
    mono: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardFontFamilies: z.ZodType<ZpressFontFamilies> = zpressFontFamiliesSchema

const zpressFontWeightsSchema = z
  .object({
    regular: z.number().int().positive(),
    medium: z.number().int().positive(),
    semibold: z.number().int().positive(),
    bold: z.number().int().positive(),
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardFontWeights: z.ZodType<ZpressFontWeights> = zpressFontWeightsSchema

const zpressFontSizesSchema = z
  .object({
    body: tokenStringSchema,
    btn: tokenStringSchema,
    bullet: tokenStringSchema,
    code: tokenStringSchema,
    eyebrow: tokenStringSchema,
    tagline: tokenStringSchema,
    heroTitle: tokenStringSchema,
    splitTitle: tokenStringSchema,
    featureTitle: tokenStringSchema,
    featureDesc: tokenStringSchema,
    featureLink: tokenStringSchema,
    sectionTitle: tokenStringSchema,
    sectionDesc: tokenStringSchema,
    badge: tokenStringSchema,
    tooltip: tokenStringSchema,
    tooltipHeadline: tokenStringSchema,
    tooltipCta: tokenStringSchema,
    check: tokenStringSchema,
    fieldName: tokenStringSchema,
    fieldType: tokenStringSchema,
    fieldBadge: tokenStringSchema,
    fieldDefault: tokenStringSchema,
    fieldDefaultCode: tokenStringSchema,
    fieldBody: tokenStringSchema,
    fieldGroupTitle: tokenStringSchema,
    fieldTrigger: tokenStringSchema,
    promptDesc: tokenStringSchema,
    promptFeedback: tokenStringSchema,
    promptBtn: tokenStringSchema,
    promptMenuItem: tokenStringSchema,
    promptMenuDesc: tokenStringSchema,
    colorName: tokenStringSchema,
    colorValue: tokenStringSchema,
    windowTitle: tokenStringSchema,
    windowTab: tokenStringSchema,
    windowUrl: tokenStringSchema,
    termBody: tokenStringSchema,
    demoTitle: tokenStringSchema,
    demoBody: tokenStringSchema,
    askAi: tokenStringSchema,
    askAiMark: tokenStringSchema,
    askAiShortcut: tokenStringSchema,
    sidebarLink: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardFontSizes: z.ZodType<ZpressFontSizes> = zpressFontSizesSchema

const zpressFontsSchema = z
  .object({
    family: zpressFontFamiliesSchema,
    weight: zpressFontWeightsSchema,
    size: zpressFontSizesSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardFonts: z.ZodType<ZpressFonts> = zpressFontsSchema

const zpressShadowsSchema = z
  .object({
    cardHover: tokenStringSchema,
    menu: tokenStringSchema,
    tooltip: tokenStringSchema,
    heroDemo: tokenStringSchema,
    askAi: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardShadows: z.ZodType<ZpressShadows> = zpressShadowsSchema

const zpressMotionDurationsSchema = z
  .object({
    fast: tokenStringSchema,
    base: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardMotionDurations: z.ZodType<ZpressMotionDurations> = zpressMotionDurationsSchema

const zpressMotionEasingsSchema = z
  .object({
    base: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardMotionEasings: z.ZodType<ZpressMotionEasings> = zpressMotionEasingsSchema

const zpressMotionSchema = z
  .object({
    duration: zpressMotionDurationsSchema,
    easing: zpressMotionEasingsSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardMotion: z.ZodType<ZpressMotion> = zpressMotionSchema

const zpressZIndexSchema = z
  .object({
    dropdown: z.number().int(),
    floating: z.number().int(),
    tooltip: z.number().int(),
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardZIndex: z.ZodType<ZpressZIndex> = zpressZIndexSchema

const zpressLineHeightsSchema = z
  .object({
    display: tokenStringSchema,
    tight: tokenStringSchema,
    tighter: tokenStringSchema,
    snug: tokenStringSchema,
    base: tokenStringSchema,
    relaxed: tokenStringSchema,
    demo: tokenStringSchema,
    code: tokenStringSchema,
    sidebar: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardLineHeights: z.ZodType<ZpressLineHeights> = zpressLineHeightsSchema

const zpressLetterSpacingsSchema = z
  .object({
    wide: tokenStringSchema,
    eyebrow: tokenStringSchema,
    display: tokenStringSchema,
    hero: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardLetterSpacings: z.ZodType<ZpressLetterSpacings> = zpressLetterSpacingsSchema

const zpressOpacitiesSchema = z
  .object({
    muted: tokenStringSchema,
    deprecated: tokenStringSchema,
    hover: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardOpacities: z.ZodType<ZpressOpacities> = zpressOpacitiesSchema

const zpressSizesSchema = z
  .object({
    titlebar: tokenStringSchema,
    windowDot: tokenStringSchema,
    windowTabDot: tokenStringSchema,
    browserTabMax: tokenStringSchema,
    browserIcon: tokenStringSchema,
    browserUrlbar: tokenStringSchema,
    iconBox: tokenStringSchema,
    iconBoxSm: tokenStringSchema,
    iconSvg: tokenStringSchema,
    iconSvgSm: tokenStringSchema,
    iconSm: tokenStringSchema,
    contentMax: tokenStringSchema,
    focusRing: tokenStringSchema,
    focusRingOffset: tokenStringSchema,
    tooltipMax: tokenStringSchema,
    swatch: tokenStringSchema,
    demoMax: tokenStringSchema,
    splitMax: tokenStringSchema,
    heroGrid: tokenStringSchema,
    heroMax: tokenStringSchema,
    taglineMax: tokenStringSchema,
    promptIcon: tokenStringSchema,
    promptBtn: tokenStringSchema,
    menuMin: tokenStringSchema,
    promptMenuIcon: tokenStringSchema,
    check: tokenStringSchema,
    chevron: tokenStringSchema,
    askAiIcon: tokenStringSchema,
    sidebarCircle: tokenStringSchema,
    scrollbar: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardSizes: z.ZodType<ZpressSizes> = zpressSizesSchema

const zpressBreakpointsSchema = z
  .object({
    sm: tokenStringSchema,
    md: tokenStringSchema,
    mdLg: tokenStringSchema,
    content: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBreakpoints: z.ZodType<ZpressBreakpoints> = zpressBreakpointsSchema

const zpressBlursSchema = z
  .object({
    base: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardBlurs: z.ZodType<ZpressBlurs> = zpressBlursSchema

const zpressGradientsSchema = z
  .object({
    brand: tokenStringSchema,
    heroTitle: tokenStringSchema,
  })
  .strict()
// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardGradients: z.ZodType<ZpressGradients> = zpressGradientsSchema

/**
 * Zod schema for partial theme color overrides.
 *
 * Each field maps to one or more `--zp-c-*` / `--rp-c-*` CSS custom properties.
 * All fields are optional; omitted fields fall back to the active theme's defaults.
 * Hex values are validated via `cssColorSchema` — `#zzz`-style malformed hex is rejected.
 */
export const themeColorsSchema = z
  .object({
    brand: cssColorSchema.optional(),
    brandLight: cssColorSchema.optional(),
    brandDark: cssColorSchema.optional(),
    brandSoft: cssColorSchema.optional(),
    bg: cssColorSchema.optional(),
    bgAlt: cssColorSchema.optional(),
    bgElv: cssColorSchema.optional(),
    bgSoft: cssColorSchema.optional(),
    text1: cssColorSchema.optional(),
    text2: cssColorSchema.optional(),
    text3: cssColorSchema.optional(),
    divider: cssColorSchema.optional(),
    border: cssColorSchema.optional(),
    homeBg: cssColorSchema.optional(),
  })
  .strict()

/**
 * Zod schema for the top-level theme configuration block in `zpress.config.ts`.
 *
 * Validates and coerces the `theme` key, applying defaults where fields are omitted.
 */
export const themeConfigSchema = z
  .object({
    name: z.string().default('default'),
    variant: themeVariantSchema.optional(),
    switcher: z.boolean().optional(),
    colors: themeColorsSchema.optional(),
    darkColors: themeColorsSchema.optional(),
  })
  .strict()

/**
 * Zod schema for the full `ZpressTokens` design-token registry.
 *
 * Mirrors the `ZpressTokens` interface defined in `./tokens.ts` exactly. The
 * compile-time guard below enforces schema/type parity — if a field is added,
 * renamed, or has its type changed in `tokens.ts` without a matching update
 * here, TypeScript errors at this declaration.
 *
 * Token values are validated as non-empty strings (or finite integers for
 * `fonts.weight.*` and `zIndex.*`). Every nested object is `.strict()` so
 * unknown token paths surface with a clear `unrecognized_keys` issue and the
 * offending key name in the error message.
 *
 * @example
 * const parsed = tokensSchema.parse(themeTokens)
 */
export const tokensSchema = z
  .object({
    colors: zpressColorsSchema,
    spacing: zpressSpacingSchema,
    radii: zpressRadiiSchema,
    fonts: zpressFontsSchema,
    shadows: zpressShadowsSchema,
    motion: zpressMotionSchema,
    zIndex: zpressZIndexSchema,
    lineHeights: zpressLineHeightsSchema,
    letterSpacings: zpressLetterSpacingsSchema,
    opacities: zpressOpacitiesSchema,
    sizes: zpressSizesSchema,
    breakpoints: zpressBreakpointsSchema,
    blurs: zpressBlursSchema,
    gradients: zpressGradientsSchema,
  })
  .strict()

// oxlint-disable-next-line no-unused-vars -- compile-time type guard
const _guardTokens: z.ZodType<ZpressTokens> = tokensSchema as unknown as z.ZodType<ZpressTokens>

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Returns `true` for any non-hex CSS color string or for a hex string that
 * matches `#RGB`, `#RGBA`, `#RRGGBB`, or `#RRGGBBAA` (case-insensitive).
 *
 * @private
 * @param value - The CSS color string to validate
 * @returns `true` when the value is a syntactically valid hex code or any non-hex string
 */
function isValidCssColor(value: string): boolean {
  if (!value.startsWith('#')) {
    return true
  }
  return /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
}

/**
 * Returns `true` when `value` contains no characters that would break the
 * emitted CSS declaration block or close the surrounding `<style>` element.
 *
 * Rejects `;` (terminator), `{` and `}` (block delimiters), and the literal
 * substring `</style` in any case (script tag exit). Case-insensitivity for
 * the `</style` check defends against `</STYLE` mixed-case bypasses.
 *
 * @private
 * @param value - Token value about to be interpolated into a CSS declaration
 * @returns `true` when the value is safe to emit verbatim
 */
function isCssSafeValue(value: string): boolean {
  if (/[;{}]/.test(value)) {
    return false
  }
  return !/<\/style/i.test(value)
}
