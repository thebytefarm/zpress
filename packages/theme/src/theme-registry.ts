/**
 * |===========================================================================|
 *   theme-registry.ts — Pure theme factory + built-in registry + CSS emitter
 *
 *   This module owns three things:
 *
 *     1. `defineTheme(input)`         — validate any (built-in or custom) theme
 *                                       input through `tokensSchema` and return
 *                                       a deeply frozen `ZpressTheme`.
 *     2. `BUILT_IN_THEMES`            — the three first-party themes (`base`,
 *                                       `midnight`, `arcade`) built from the
 *                                       palette currently encoded across
 *                                       `packages/ui/src/theme/styles/themes/*.css`
 *                                       and `brand-colors.ts`.
 *     3. `themeToCss(theme)`          — deterministic, dependency-free CSS
 *                                       emitter that renders every token from
 *                                       `TOKEN_TO_CSS_VAR` into a single
 *                                       `html[data-zp-theme='{name}']` block.
 *
 *   No side effects, no mutation, no classes. The factory uses
 *   `tokensSchema.parse` (the schema's documented usage) — on invalid input
 *   the Zod parser produces a structured `ZodError` at the boundary, which is
 *   the contract for `defineTheme` consumers.
 *
 *   Cross-theme baseline values (tints, terminal, badges, scrollbar, syntax,
 *   gradients, fonts, spacing, radii, shadows, motion, …) are harvested from
 *   `.snapshots/baseline/token-audit.txt` and
 *   `packages/ui/src/theme/styles/overrides/tokens.css` — the registry is the
 *   single source of truth from this point forward.
 * |===========================================================================|
 */

import type { z } from 'zod'

import { tokensSchema } from './schema.ts'
import type { TokenPath, ZpressTokens } from './tokens.ts'
import { TOKEN_TO_CSS_VAR } from './tokens.ts'
import type { BuiltInThemeName, ColorMode } from './types.ts'

// ---------------------------------------------------------------------------
// Module-level constants — referenced by the public exports below
// ---------------------------------------------------------------------------

/**
 * Default modes applied when `defineTheme` callers omit the `modes` field.
 */
const DEFAULT_MODES: readonly ('dark' | 'light')[] = ['dark', 'light'] as const

/**
 * Default `colorMode` applied when `defineTheme` callers omit the field.
 */
const DEFAULT_MODE: ColorMode = 'toggle'

/**
 * Shape of the raw brand-palette entries below. Mirrors the public
 * `BrandPalette` interface re-exported from `brand-colors.ts`, but is declared
 * locally so this module does not pull a value/type import from
 * `brand-colors.ts` (which already depends on `BUILT_IN_THEMES`).
 */
interface RawBrandPalette {
  readonly primary: string
  readonly hover: string
  readonly active: string
  readonly fg: string
  readonly soft: string
  readonly light: string
  readonly lighter: string
}

/**
 * Raw brand palette literals — the source of truth for every built-in theme's
 * `colors.brand` token group. Keeping these as module-private constants lets
 * `brand-colors.ts` derive its public `BRAND_COLORS` from `BUILT_IN_THEMES`
 * without introducing a circular import.
 *
 * `light` / `lighter` shades feed the Rspress compat block — they live on the
 * brand surface so `LEGACY_RP_VAR_MAP` can pick them up by token path.
 */
const BRAND_PALETTES: Readonly<Record<BuiltInThemeName, RawBrandPalette>> = Object.freeze({
  base: {
    primary: '#7c3aed',
    hover: '#6d28d9',
    active: '#5b21b6',
    fg: '#ffffff',
    soft: 'rgba(124, 58, 237, 0.14)',
    light: '#8b5cf6',
    lighter: '#a78bfa',
  },
  midnight: {
    primary: '#60a5fa',
    hover: '#3b82f6',
    active: '#2563eb',
    fg: '#0a0a0a',
    soft: 'rgba(96, 165, 250, 0.14)',
    light: '#93c5fd',
    lighter: '#bfdbfe',
  },
  arcade: {
    primary: '#00ff88',
    hover: '#00cc6a',
    active: '#00aa55',
    fg: '#001a0a',
    soft: 'rgba(0, 255, 136, 0.14)',
    light: '#66ffbb',
    lighter: '#99ffcc',
  },
})

/**
 * Declared-order list of every leaf token path in `TOKEN_TO_CSS_VAR`.
 * Captured once at module load so `themeToCss` output stays byte-deterministic
 * regardless of how callers construct token trees.
 */
const TOKEN_PATHS: readonly (keyof typeof TOKEN_TO_CSS_VAR)[] = Object.freeze(
  Object.keys(TOKEN_TO_CSS_VAR) as (keyof typeof TOKEN_TO_CSS_VAR)[]
)

/**
 * Shared tints — registry copied verbatim from `.snapshots/baseline/token-audit.txt`
 * (home-card.css L48–L116 and matching rows in section-card.css). These values
 * are currently identical across themes; theme-specific overrides will be
 * wired up by task 2.4 if/when needed.
 */
const SHARED_TINT_COLORS = {
  purple: { bg: 'rgba(167, 139, 250, 0.12)', fg: '#a78bfa' },
  blue: { bg: 'rgba(96, 165, 250, 0.12)', fg: '#60a5fa' },
  green: { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34d399' },
  amber: { bg: 'rgba(251, 191, 36, 0.12)', fg: '#fbbf24' },
  red: { bg: 'rgba(248, 113, 113, 0.12)', fg: '#f87171' },
  slate: { bg: 'rgba(148, 163, 184, 0.12)', fg: '#94a3b8' },
  cyan: { bg: 'rgba(14, 165, 233, 0.12)', fg: '#0ea5e9' },
  pink: { bg: 'rgba(244, 114, 182, 0.12)', fg: '#f472b6' },
  purpleBright: { fg: '#c084fc' },
  amberBright: { fg: '#fcd34d' },
  purpleGlow: 'rgba(167, 139, 250, 0.08)',
} as const

/**
 * Shared terminal palette — from `desktop-window.css` audit rows L245–L338.
 */
const SHARED_TERMINAL_COLORS = {
  bg: '#0d0d0d',
  titlebarBg: '#161616',
  border: '#222222',
  title: '#888888',
  text: '#d4d4d4',
  promptPrefix: '#888888',
  output: '#aaaaaa',
  red: '#f87171',
  green: '#4ade80',
  blue: '#60a5fa',
  yellow: '#fbbf24',
  cyan: '#22d3ee',
  magenta: '#c084fc',
  white: '#f5f5f5',
  gray: '#888888',
  success: '#4ade80',
  error: '#f87171',
  warn: '#fbbf24',
  info: '#60a5fa',
  muted: '#888888',
  bar: '#888888',
  step: '#c084fc',
} as const

/**
 * Shared window-chrome traffic-light dots — from `desktop-window.css`
 * rows L33–L41 and L50.
 */
const SHARED_WINDOW_COLORS = {
  dotClose: '#ff5f57',
  dotMinimize: '#febc2e',
  dotMaximize: '#28c840',
  titleFallback: '#888888',
} as const

/**
 * Shared status badge palette — from `status-badge.css` rows L20–L36.
 */
const SHARED_BADGE_COLORS = {
  info: { bg: 'rgba(37, 99, 235, 0.12)', fg: '#2563eb' },
  success: { bg: 'rgba(16, 185, 129, 0.12)', fg: '#059669' },
  warning: { bg: 'rgba(217, 119, 6, 0.12)', fg: '#d97706' },
  error: { bg: 'rgba(220, 38, 38, 0.12)', fg: '#dc2626' },
} as const

/**
 * Shared scrollbar palette — from `scrollbar.css` rows L18, L24.
 */
const SHARED_SCROLLBAR_COLORS = {
  thumb: '#3a3a3a',
  thumbHover: '#4a4a4a',
} as const

/**
 * Shared syntax-highlighting tokens — from `split.css` rows L137–L139.
 */
const SHARED_SYNTAX_COLORS = {
  kw: '#c084fc',
  str: '#fcd34d',
  fn: '#60a5fa',
} as const

/**
 * Shared hero-gradient stops — from `hero.css` row L62.
 */
const SHARED_GRADIENT_COLORS = {
  heroCyan: '#06b6d4',
  heroPurple: '#a855f7',
} as const

/**
 * Mapping of legacy Rspress (`--rp-*`) compatibility variables to the zpress
 * token path that supplies each value. Emitted by `themeToCss` after the
 * canonical `--zp-*` declaration block so Rspress's internal components stay
 * themed without referencing zpress-specific names.
 *
 * `--rp-c-link` reuses the brand primary; `--rp-c-bg-mute` reuses the elevated
 * surface — both are derived in the original CSS files at HEAD and recreated
 * here so the emitted CSS matches the legacy token surface.
 */
const LEGACY_RP_VAR_MAP: Readonly<Record<string, TokenPath>> = Object.freeze({
  '--rp-c-bg': 'colors.surface.bg',
  '--rp-c-bg-soft': 'colors.surface.bgSoft',
  '--rp-c-bg-mute': 'colors.surface.bgElv',
  '--rp-c-brand': 'colors.brand.primary',
  '--rp-c-brand-light': 'colors.brand.light',
  '--rp-c-brand-lighter': 'colors.brand.lighter',
  '--rp-c-brand-dark': 'colors.brand.hover',
  '--rp-c-brand-darker': 'colors.brand.active',
  '--rp-c-brand-tint': 'colors.brand.soft',
  '--rp-c-divider': 'colors.border.divider',
  '--rp-c-link': 'colors.brand.primary',
  '--rp-c-text-1': 'colors.text.text1',
  '--rp-c-text-2': 'colors.text.text2',
  '--rp-c-text-3': 'colors.text.text3',
  '--rp-code-block-bg': 'colors.surface.codeBlockBg',
  '--rp-home-background-bg': 'colors.surface.homeBg',
})

/**
 * Declared-order list of `--rp-*` keys for deterministic emission ordering.
 */
const LEGACY_RP_VAR_NAMES: readonly string[] = Object.freeze(Object.keys(LEGACY_RP_VAR_MAP))

/**
 * Shared OpenAPI / OAS badge palette — light-mode values from `base.css` at
 * HEAD. Midnight and arcade override the entire set via their own constants.
 */
const SHARED_OAS_COLORS_BASE = {
  get: '#16a34a',
  post: '#2563eb',
  put: '#d97706',
  patch: '#d97706',
  delete: '#dc2626',
  deprecated: 'var(--zp-c-text-3)',
  required: '#dc2626',
} as const

/**
 * OAS palette for the `midnight` theme — from `midnight.css` at HEAD.
 */
const MIDNIGHT_OAS_COLORS = {
  get: '#34d399',
  post: '#60a5fa',
  put: '#fbbf24',
  patch: '#fbbf24',
  delete: '#f87171',
  deprecated: 'var(--zp-c-text-3)',
  required: '#f87171',
} as const

/**
 * OAS palette for the `arcade` theme — from `arcade.css` at HEAD.
 */
const ARCADE_OAS_COLORS = {
  get: '#00ff88',
  post: '#00ccff',
  put: '#ffaa00',
  patch: '#ffaa00',
  delete: '#ff4466',
  deprecated: 'var(--zp-c-text-3)',
  required: '#ff4466',
} as const

/**
 * Shared semantic palette — derived from `:root` light defaults in `base.css`.
 * OpenAPI method colors are the canonical semantic source for
 * `success`/`error`/`warn`/`info`; `muted` mirrors the dimmed terminal grey.
 */
const SHARED_SEMANTIC_COLORS = {
  success: '#16a34a',
  error: '#dc2626',
  warn: '#d97706',
  info: '#2563eb',
  muted: '#888888',
} as const

/**
 * Shared spacing scale — mirrors `tokens.css` lines L112–L133.
 */
const SHARED_SPACING = {
  s1: '1px',
  s2: '2px',
  s3: '3px',
  s4: '4px',
  s5: '5px',
  s6: '6px',
  s8: '8px',
  s10: '10px',
  s12: '12px',
  s14: '14px',
  s16: '16px',
  s18: '18px',
  s20: '20px',
  s24: '24px',
  s28: '28px',
  s32: '32px',
  s40: '40px',
  s48: '48px',
  s56: '56px',
  s64: '64px',
  s72: '72px',
  s96: '96px',
} as const

/**
 * Shared radii — mirrors `tokens.css` lines L136–L143.
 */
const SHARED_RADII = {
  xs: '2px',
  xsSm: '3px',
  sm: '4px',
  mdSm: '6px',
  md: '8px',
  lg: '10px',
  mdLg: '12px',
  pill: '9999px',
} as const

/**
 * Shared font tokens — families, weights, and sizes from `tokens.css`
 * lines L33–L109.
 */
const SHARED_FONTS = {
  family: {
    sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, 'SFMono-Regular', monospace",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  size: {
    body: '16px',
    btn: '14px',
    bullet: '14px',
    code: '13px',
    eyebrow: '11px',
    tagline: '18px',
    heroTitle: 'clamp(40px, 6.5vw, 76px)',
    splitTitle: 'clamp(28px, 4vw, 40px)',
    featureTitle: '18px',
    featureDesc: '16px',
    featureLink: '12px',
    sectionTitle: '14px',
    sectionDesc: '12.5px',
    badge: '11px',
    tooltip: '13px',
    tooltipHeadline: '13px',
    tooltipCta: '12px',
    check: '11px',
    fieldName: '14px',
    fieldType: '11px',
    fieldBadge: '11px',
    fieldDefault: '12px',
    fieldDefaultCode: '11px',
    fieldBody: '14px',
    fieldGroupTitle: '14px',
    fieldTrigger: '12px',
    promptDesc: '14px',
    promptFeedback: '12px',
    promptBtn: '12px',
    promptMenuItem: '13px',
    promptMenuDesc: '11px',
    colorName: '12px',
    colorValue: '11px',
    windowTitle: '12px',
    windowTab: '12px',
    windowUrl: '11px',
    termBody: '13px',
    demoTitle: '11px',
    demoBody: '13px',
    askAi: '13px',
    askAiMark: '10px',
    askAiShortcut: '10px',
    sidebarLink: '14px',
  },
} as const

/**
 * Shared shadow recipes — mirrors `tokens.css` lines L159–L173.
 */
const SHARED_SHADOWS = {
  cardHover: '0 2px 12px var(--zp-c-tint-purple-glow)',
  menu: '0 8px 24px rgba(0, 0, 0, 0.12)',
  tooltip: '0 4px 12px rgba(0, 0, 0, 0.08)',
  heroDemo:
    '0 0 0 1px rgba(0, 0, 0, 0.5), 0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 80px var(--zp-c-brand-soft)',
  askAi: '0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(0, 0, 0, 0.5)',
} as const

/**
 * Shared motion tokens — mirrors `tokens.css` lines L176–L178.
 */
const SHARED_MOTION = {
  duration: {
    fast: '0.15s',
    base: '0.2s',
  },
  easing: {
    base: 'ease',
  },
} as const

/**
 * Shared z-index scale — mirrors `tokens.css` lines L181–L183.
 */
const SHARED_Z_INDEX = {
  dropdown: 50,
  floating: 60,
  tooltip: 100,
} as const

/**
 * Shared line-height scale — mirrors `tokens.css` lines L186–L194.
 */
const SHARED_LINE_HEIGHTS = {
  display: '1',
  tight: '1.4',
  tighter: '1.3',
  snug: '1.45',
  base: '1.5',
  relaxed: '1.6',
  demo: '1.65',
  code: '1.7',
  sidebar: '24px',
} as const

/**
 * Shared letter-spacing scale — mirrors `tokens.css` lines L197–L200.
 */
const SHARED_LETTER_SPACINGS = {
  wide: '0.02em',
  eyebrow: '0.1em',
  display: '-0.025em',
  hero: '-0.04em',
} as const

/**
 * Shared opacity scale — mirrors `tokens.css` lines L203–L205.
 */
const SHARED_OPACITIES = {
  muted: '0.5',
  deprecated: '0.6',
  hover: '0.8',
} as const

/**
 * Shared component sizes — mirrors `tokens.css` lines L208–L237.
 */
const SHARED_SIZES = {
  titlebar: '36px',
  windowDot: '10px',
  windowTabDot: '6px',
  browserTabMax: '200px',
  browserIcon: '14px',
  browserUrlbar: '28px',
  iconBox: '36px',
  iconBoxSm: '28px',
  iconSvg: '18px',
  iconSvgSm: '16px',
  iconSm: '16px',
  contentMax: '1152px',
  focusRing: '2px',
  focusRingOffset: '2px',
  tooltipMax: '320px',
  swatch: '24px',
  demoMax: '920px',
  splitMax: '1200px',
  heroGrid: '24px',
  heroMax: '1100px',
  taglineMax: '640px',
  promptIcon: '20px',
  promptBtn: '30px',
  menuMin: '220px',
  promptMenuIcon: '18px',
  check: '18px',
  chevron: '14px',
  askAiIcon: '18px',
  sidebarCircle: '36px',
  scrollbar: '6px',
} as const

/**
 * Shared breakpoints — mirrors `tokens.css` lines L240–L243.
 */
const SHARED_BREAKPOINTS = {
  sm: '768px',
  md: '720px',
  mdLg: '880px',
  content: '1184px',
} as const

/**
 * Shared backdrop blur — mirrors `tokens.css` line L246.
 */
const SHARED_BLURS = {
  base: '8px',
} as const

/**
 * Shared gradient recipes — mirrors `tokens.css` lines L253–L263.
 */
const SHARED_GRADIENTS = {
  brand: 'linear-gradient(135deg, var(--zp-c-brand-1), var(--zp-c-brand-3))',
  heroTitle:
    'linear-gradient(120deg, var(--zp-c-brand-1) 0%, var(--zp-c-gradient-hero-cyan) 50%, var(--zp-c-gradient-hero-purple) 100%)',
} as const

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The supported color modes a theme renders correctly under.
 *
 * `'dark' | 'light'` only — `'toggle'` is a *control* value (lives on
 * `defaultMode`), not an actual rendered mode.
 */
export type ThemeMode = 'dark' | 'light'

/**
 * Fully resolved theme definition produced by `defineTheme`.
 *
 * A `ZpressTheme` is the runtime contract between the registry and the
 * rest of the system (CSS emitter, theme switcher, brand-color helpers).
 * The shape is intentionally flat so it serialises trivially to JSON for
 * documentation tooling and snapshot tests.
 */
export interface ZpressTheme {
  /**
   * Identifier — matches `html[data-zp-theme='{name}']`.
   */
  readonly name: string
  /**
   * Validated, frozen token tree.
   */
  readonly tokens: ZpressTokens
  /**
   * Modes this theme renders correctly under.
   */
  readonly modes: readonly ThemeMode[]
  /**
   * Default `colorMode` for this theme (`'dark' | 'light' | 'toggle'`).
   */
  readonly defaultMode: ColorMode
}

/**
 * Input shape accepted by `defineTheme`. The `tokens` field is `unknown`
 * because validation is the factory's responsibility — callers may pass
 * raw JSON or a partially-typed object and let Zod produce a clear error.
 */
export interface ZpressThemeInput {
  /**
   * Identifier — must match `html[data-zp-theme='{name}']`.
   */
  readonly name: string
  /**
   * Token tree, validated against `tokensSchema` at factory time.
   */
  readonly tokens: unknown
  /**
   * Modes the theme renders correctly under. Defaults to `['dark', 'light']`.
   */
  readonly modes?: readonly ThemeMode[]
  /**
   * Default color-mode behaviour. Defaults to `'toggle'`.
   */
  readonly defaultMode?: ColorMode
}

/**
 * Validate a raw theme definition through `tokensSchema` and return a
 * deeply frozen `ZpressTheme`.
 *
 * Validation failure surfaces as a `ZodError` from `tokensSchema.parse` —
 * that's the documented usage of the schema and the only contract callers
 * need to handle. Successful calls return a frozen object tree; mutating
 * any nested property is a hard failure in strict mode.
 *
 * @param input - Theme definition (name + token tree + optional modes/defaultMode)
 * @returns A frozen, fully-typed `ZpressTheme`
 *
 * @example
 * const myTheme = defineTheme({
 *   name: 'custom',
 *   tokens: tokens,
 *   modes: ['dark'],
 *   defaultMode: 'dark',
 * })
 */
export function defineTheme(input: ZpressThemeInput): ZpressTheme {
  const { name, tokens, modes, defaultMode } = input
  const validated: ZpressTokens = tokensSchema.parse(tokens) as ZpressTokens
  return freezeTheme({
    name,
    tokens: validated,
    modes: modes ?? DEFAULT_MODES,
    defaultMode: defaultMode ?? DEFAULT_MODE,
  })
}

/**
 * Render a `ZpressTheme` to a single, byte-deterministic CSS block.
 *
 * Iteration order is fixed by the declaration order of `TOKEN_TO_CSS_VAR`
 * (followed by the declaration order of `LEGACY_RP_VAR_MAP` for the Rspress
 * compat suffix) so re-running this function on the same input always
 * produces the exact same string — required for snapshot tests and
 * reproducible builds.
 *
 * The default theme (`'base'`) receives an additional `:root { ... }` block
 * with identical contents so the browser can apply its tokens before JS
 * hydration sets `[data-zp-theme]` on the `<html>` element (FOUC fallback).
 *
 * @param theme - Theme to render
 * @returns CSS source containing one or two declaration blocks
 *
 * @example
 * const css = themeToCss(BUILT_IN_THEMES.base)
 * // => ":root {\n  --zp-c-brand-1: #7c3aed;\n  ...\n}\n\nhtml[data-zp-theme='base'] {\n  ...\n}\n"
 */
export function themeToCss(theme: ZpressTheme): string {
  return renderThemeCss(theme, 'base')
}

/**
 * The three first-party themes shipped with zpress.
 *
 * Each entry is the result of `defineTheme` over a hand-curated token tree
 * lifted from `packages/ui/src/theme/styles/themes/{base,midnight,arcade}.css`
 * (theme-specific surfaces / text / borders / brand) plus
 * `packages/ui/src/theme/styles/overrides/tokens.css` (structural tokens that
 * are identical across themes) and the component-level audit in
 * `.snapshots/baseline/token-audit.txt` (tints, terminal, badges, syntax,
 * gradient, scrollbar).
 */
export const BUILT_IN_THEMES: Readonly<Record<BuiltInThemeName, ZpressTheme>> = Object.freeze({
  base: defineTheme({
    name: 'base',
    tokens: buildBaseTokens(),
    modes: ['dark', 'light'],
    defaultMode: 'toggle',
  }),
  midnight: defineTheme({
    name: 'midnight',
    tokens: buildMidnightTokens(),
    modes: ['dark'],
    defaultMode: 'dark',
  }),
  arcade: defineTheme({
    name: 'arcade',
    tokens: buildArcadeTokens(),
    modes: ['dark'],
    defaultMode: 'dark',
  }),
})

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Schema-inferred output type — bridges `ZpressTokens` (the strict surface
 * used at compile time) with whatever `tokensSchema.parse` resolves to
 * internally. Kept type-only.
 *
 * @private
 */
type ParsedTokens = z.infer<typeof tokensSchema>

/**
 * Resolve a dotted token path against a `ZpressTokens` tree.
 *
 * Walks the path with `.reduce`, never mutates intermediate state, and
 * trusts the `TokenPath` literal union — if a path resolves to `undefined`,
 * the registry itself is malformed, not the input.
 *
 * @private
 * @param path - Dotted leaf path (e.g. `'colors.brand.primary'`)
 * @param tokens - Token tree to walk
 * @returns The leaf value (string or number) at `path`
 */
function resolveTokenValue(path: string, tokens: ZpressTokens): string | number {
  const segments = path.split('.')
  const value = segments.reduce<unknown>(
    (node, segment) => (node as Record<string, unknown>)[segment],
    tokens
  )
  return value as string | number
}

/**
 * Render a single `  --zp-*: value;` line for one token path.
 *
 * @private
 * @param path - Token path in the `TOKEN_TO_CSS_VAR` registry
 * @param tokens - Token tree containing the value
 * @returns CSS declaration line (no trailing newline)
 */
function renderDeclaration(path: keyof typeof TOKEN_TO_CSS_VAR, tokens: ZpressTokens): string {
  const cssVar = TOKEN_TO_CSS_VAR[path]
  const value = resolveTokenValue(path, tokens)
  return `  ${cssVar}: ${value};`
}

/**
 * Render a single `  --rp-*: value;` line for a Rspress compatibility var.
 *
 * @private
 * @param cssVar - The `--rp-*` custom property name
 * @param tokens - Token tree containing the source value
 * @returns CSS declaration line (no trailing newline)
 */
function renderRpDeclaration(cssVar: string, tokens: ZpressTokens): string {
  const path = LEGACY_RP_VAR_MAP[cssVar] as TokenPath
  const value = resolveTokenValue(path, tokens)
  return `  ${cssVar}: ${value};`
}

/**
 * Render the full declaration body — all `--zp-*` tokens in registry order
 * followed by every `--rp-*` compatibility var in `LEGACY_RP_VAR_MAP` order.
 *
 * @private
 * @param tokens - Token tree to render
 * @returns Multi-line CSS body (no surrounding braces)
 */
function renderDeclarationBody(tokens: ZpressTokens): string {
  const zpLines = TOKEN_PATHS.map((path) => renderDeclaration(path, tokens))
  const rpLines = LEGACY_RP_VAR_NAMES.map((name) => renderRpDeclaration(name, tokens))
  return [...zpLines, ...rpLines].join('\n')
}

/**
 * Render the complete CSS for a theme. When `theme.name` matches
 * `defaultThemeName`, an additional `:root { ... }` FOUC fallback block is
 * emitted before the `html[data-zp-theme='{name}']` block with identical
 * contents.
 *
 * @private
 * @param theme - Theme to render
 * @param defaultThemeName - Name of the theme that should also emit `:root`
 * @returns CSS source containing one or two declaration blocks
 */
function renderThemeCss(theme: ZpressTheme, defaultThemeName: string): string {
  const body = renderDeclarationBody(theme.tokens)
  const dataAttrBlock = `html[data-zp-theme='${theme.name}'] {\n${body}\n}\n`
  if (theme.name !== defaultThemeName) {
    return dataAttrBlock
  }
  const rootBlock = `:root {\n${body}\n}\n`
  return `${rootBlock}\n${dataAttrBlock}`
}

/**
 * Freeze the outer `ZpressTheme` shell plus the entire nested token tree.
 *
 * Returns the same reference rather than a clone — inputs come from literal
 * object expressions that are not aliased anywhere else.
 *
 * @private
 * @param theme - Theme to freeze
 * @returns Same theme, deeply frozen
 */
function freezeTheme(theme: ZpressTheme): ZpressTheme {
  return Object.freeze({
    name: theme.name,
    tokens: deepFreeze(theme.tokens),
    modes: Object.freeze([...theme.modes]),
    defaultMode: theme.defaultMode,
  })
}

/**
 * Recursively freeze every plain-object node in a value graph.
 *
 * Arrays and primitives pass through untouched. Non-plain objects are not
 * expected on this surface; if any appear they're returned as-is.
 *
 * @private
 * @param value - Value to freeze
 * @returns Same reference, deeply frozen if it's a plain object
 */
function deepFreeze<T>(value: T): T {
  if (value === null) {
    return value
  }
  if (typeof value !== 'object') {
    return value
  }
  // Walk every child reference with `.reduce` (codebase rules forbid
  // `.forEach` and `for` loops). The accumulator is the (already-frozen)
  // parent itself — `Object.freeze` is an in-place operation by contract.
  return Object.values(value as Record<string, unknown>).reduce<T>(
    (parent, child) => freezeChildThenReturnParent(parent, child),
    Object.freeze(value) as T
  )
}

/**
 * Freeze `child` recursively and return the (already-frozen) `parent`
 * unchanged. Exists purely so the reducer in `deepFreeze` stays expression-
 * only — codebase rules forbid expression statements.
 *
 * @private
 * @param parent - The parent node being walked
 * @param child - Child reference whose subtree should be frozen
 * @returns `parent`, untouched
 */
function freezeChildThenReturnParent<T>(parent: T, child: unknown): T {
  const _frozen = deepFreeze(child)
  return parent
}

/**
 * Build the `base` theme token tree from the CSS at
 * `packages/ui/src/theme/styles/themes/base.css` (light variant). Brand
 * colors come from `brand-colors.ts` to keep the CLI/SVG generators in sync
 * with the docs site.
 *
 * @private
 * @returns Untyped token object suitable for `tokensSchema.parse`
 */
function buildBaseTokens(): ParsedTokens {
  const brand = BRAND_PALETTES.base
  return {
    colors: {
      brand: {
        primary: brand.primary,
        hover: brand.hover,
        active: brand.active,
        fg: brand.fg,
        soft: brand.soft,
        onBrand: '#ffffff',
        light: brand.light,
        lighter: brand.lighter,
      },
      semantic: { ...SHARED_SEMANTIC_COLORS },
      surface: {
        bg: '#ffffff',
        bgAlt: '#f9f9f9',
        bgElv: '#f5f5f5',
        bgSoft: '#f0f0f0',
        bgIcon: '#cccccc',
        homeBg: '#ffffff',
        overlayFaint: 'rgba(0, 0, 0, 0.1)',
        gutter: '#f5f5f5',
        codeBlockBg: '#f5f5f5',
      },
      text: {
        text1: '#1a1a1a',
        text2: 'rgba(26, 26, 26, 0.72)',
        text3: 'rgba(26, 26, 26, 0.48)',
      },
      border: {
        border: '#d0d0d0',
        divider: '#e2e2e2',
        sidebarAltBorderDark: '#484848',
      },
      tint: { ...SHARED_TINT_COLORS },
      terminal: { ...SHARED_TERMINAL_COLORS },
      window: { ...SHARED_WINDOW_COLORS },
      badge: { ...SHARED_BADGE_COLORS },
      scrollbar: { ...SHARED_SCROLLBAR_COLORS },
      syntax: { ...SHARED_SYNTAX_COLORS },
      gradient: { ...SHARED_GRADIENT_COLORS },
      oas: { ...SHARED_OAS_COLORS_BASE },
      button: {
        brand: {
          bg: '#6d28d9',
          hoverBg: '#7c3aed',
          activeBg: '#5b21b6',
          text: '#ffffff',
        },
      },
    },
    spacing: { ...SHARED_SPACING },
    radii: { ...SHARED_RADII },
    fonts: {
      family: { ...SHARED_FONTS.family },
      weight: { ...SHARED_FONTS.weight },
      size: { ...SHARED_FONTS.size },
    },
    shadows: { ...SHARED_SHADOWS },
    motion: {
      duration: { ...SHARED_MOTION.duration },
      easing: { ...SHARED_MOTION.easing },
    },
    zIndex: { ...SHARED_Z_INDEX },
    lineHeights: { ...SHARED_LINE_HEIGHTS },
    letterSpacings: { ...SHARED_LETTER_SPACINGS },
    opacities: { ...SHARED_OPACITIES },
    sizes: { ...SHARED_SIZES },
    breakpoints: { ...SHARED_BREAKPOINTS },
    blurs: { ...SHARED_BLURS },
    gradients: { ...SHARED_GRADIENTS },
  }
}

/**
 * Build the `midnight` theme token tree from the CSS at
 * `packages/ui/src/theme/styles/themes/midnight.css`.
 *
 * @private
 * @returns Untyped token object suitable for `tokensSchema.parse`
 */
function buildMidnightTokens(): ParsedTokens {
  const brand = BRAND_PALETTES.midnight
  return {
    colors: {
      brand: {
        primary: brand.primary,
        hover: brand.hover,
        active: brand.active,
        fg: brand.fg,
        soft: brand.soft,
        onBrand: '#ffffff',
        light: brand.light,
        lighter: brand.lighter,
      },
      semantic: { ...SHARED_SEMANTIC_COLORS },
      surface: {
        bg: '#0f0f0f',
        bgAlt: '#121212',
        bgElv: '#161616',
        bgSoft: '#1a1a1a',
        bgIcon: '#2a2a2a',
        homeBg: '#0f0f0f',
        overlayFaint: 'rgba(255, 255, 255, 0.08)',
        gutter: '#121212',
        codeBlockBg: '#121212',
      },
      text: {
        text1: '#f0f0f0',
        text2: 'rgba(240, 240, 240, 0.72)',
        text3: 'rgba(240, 240, 240, 0.48)',
      },
      border: {
        border: '#282828',
        divider: '#1e1e1e',
        sidebarAltBorderDark: '#484848',
      },
      tint: { ...SHARED_TINT_COLORS },
      terminal: { ...SHARED_TERMINAL_COLORS },
      window: { ...SHARED_WINDOW_COLORS },
      badge: { ...SHARED_BADGE_COLORS },
      scrollbar: { ...SHARED_SCROLLBAR_COLORS },
      syntax: { ...SHARED_SYNTAX_COLORS },
      gradient: { ...SHARED_GRADIENT_COLORS },
      oas: { ...MIDNIGHT_OAS_COLORS },
      button: {
        brand: {
          bg: '#2563eb',
          hoverBg: '#3b82f6',
          activeBg: '#1d4ed8',
          text: '#f0f0f0',
        },
      },
    },
    spacing: { ...SHARED_SPACING },
    radii: { ...SHARED_RADII },
    fonts: {
      family: { ...SHARED_FONTS.family },
      weight: { ...SHARED_FONTS.weight },
      size: { ...SHARED_FONTS.size },
    },
    shadows: { ...SHARED_SHADOWS },
    motion: {
      duration: { ...SHARED_MOTION.duration },
      easing: { ...SHARED_MOTION.easing },
    },
    zIndex: { ...SHARED_Z_INDEX },
    lineHeights: { ...SHARED_LINE_HEIGHTS },
    letterSpacings: { ...SHARED_LETTER_SPACINGS },
    opacities: { ...SHARED_OPACITIES },
    sizes: { ...SHARED_SIZES },
    breakpoints: { ...SHARED_BREAKPOINTS },
    blurs: { ...SHARED_BLURS },
    gradients: { ...SHARED_GRADIENTS },
  }
}

/**
 * Build the `arcade` theme token tree from the CSS at
 * `packages/ui/src/theme/styles/themes/arcade.css`.
 *
 * @private
 * @returns Untyped token object suitable for `tokensSchema.parse`
 */
function buildArcadeTokens(): ParsedTokens {
  const brand = BRAND_PALETTES.arcade
  return {
    colors: {
      brand: {
        primary: brand.primary,
        hover: brand.hover,
        active: brand.active,
        fg: brand.fg,
        soft: brand.soft,
        onBrand: brand.fg,
        light: brand.light,
        lighter: brand.lighter,
      },
      semantic: { ...SHARED_SEMANTIC_COLORS },
      surface: {
        bg: '#0d0d1a',
        bgAlt: '#10102a',
        bgElv: '#141433',
        bgSoft: '#18183d',
        bgIcon: '#2a2a55',
        homeBg: '#0d0d1a',
        overlayFaint: 'rgba(102, 255, 187, 0.14)',
        gutter: '#10102a',
        codeBlockBg: '#10102a',
      },
      text: {
        text1: '#e0ffe0',
        text2: 'rgba(224, 255, 224, 0.72)',
        text3: 'rgba(224, 255, 224, 0.48)',
      },
      border: {
        border: '#252560',
        divider: '#1a1a40',
        sidebarAltBorderDark: '#484848',
      },
      tint: { ...SHARED_TINT_COLORS },
      terminal: { ...SHARED_TERMINAL_COLORS },
      window: { ...SHARED_WINDOW_COLORS },
      badge: { ...SHARED_BADGE_COLORS },
      scrollbar: { ...SHARED_SCROLLBAR_COLORS },
      syntax: { ...SHARED_SYNTAX_COLORS },
      gradient: { ...SHARED_GRADIENT_COLORS },
      oas: { ...ARCADE_OAS_COLORS },
      button: {
        brand: {
          bg: '#00aa55',
          hoverBg: '#00cc6a',
          activeBg: '#008844',
          text: '#0d0d1a',
        },
      },
    },
    spacing: { ...SHARED_SPACING },
    radii: { ...SHARED_RADII },
    fonts: {
      family: { ...SHARED_FONTS.family },
      weight: { ...SHARED_FONTS.weight },
      size: { ...SHARED_FONTS.size },
    },
    shadows: { ...SHARED_SHADOWS },
    motion: {
      duration: { ...SHARED_MOTION.duration },
      easing: { ...SHARED_MOTION.easing },
    },
    zIndex: { ...SHARED_Z_INDEX },
    lineHeights: { ...SHARED_LINE_HEIGHTS },
    letterSpacings: { ...SHARED_LETTER_SPACINGS },
    opacities: { ...SHARED_OPACITIES },
    sizes: { ...SHARED_SIZES },
    breakpoints: { ...SHARED_BREAKPOINTS },
    blurs: { ...SHARED_BLURS },
    gradients: { ...SHARED_GRADIENTS },
  }
}
