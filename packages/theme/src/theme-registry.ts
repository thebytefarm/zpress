import { z } from 'zod'

import { themeNameSchema, tokensSchema } from './schema.ts'
import type { TokenPath, ZpressTokens } from './tokens.ts'
import { TOKEN_TO_CSS_VAR } from './tokens.ts'
import type { BuiltInThemeName, ThemeVariant } from './types.ts'

// ---------------------------------------------------------------------------
// Module-level constants — referenced by the public exports below
// ---------------------------------------------------------------------------

/**
 * Variant preference order used when `defineTheme` callers omit
 * `defaultVariant`. We pick `'dark'` first because the framework treats
 * dark as its baseline aesthetic.
 */
const DEFAULT_VARIANT_ORDER: readonly ThemeVariant[] = ['dark', 'light'] as const

/**
 * Name of the framework's default theme — used by `renderThemeCss` to
 * decide which theme also emits the `:root { ... }` FOUC fallback. Kept
 * in lockstep with `BUILT_IN_THEMES.default` and the build-time fallback
 * in `packages/ui/src/config.ts`.
 */
const FOUC_ROOT_THEME_NAME = 'default' as const

/**
 * Envelope schema for `defineTheme` input. Validates the *shape* — name,
 * variant keys, and `defaultVariant` cross-reference — without parsing
 * the token trees themselves (those go through `tokensSchema` per
 * variant). Same invariants enforced by `zpressThemeInputSchema` in
 * `@zpress/config`; duplicated here because the config package depends
 * on theme, not the other way around. Errors surface with stable paths
 * (`variants`, `defaultVariant`) so consumers can pinpoint the problem.
 */
const themeInputEnvelopeSchema = z
  .object({
    name: z.string(),
    variants: z
      .object({
        dark: z.unknown().optional(),
        light: z.unknown().optional(),
      })
      .strict()
      .refine((v) => v.dark !== undefined || v.light !== undefined, {
        message: 'Theme variants must declare at least one of `dark` or `light`',
      }),
    defaultVariant: z.enum(['dark', 'light']).optional(),
  })
  .strict()
  .refine(
    (theme) => {
      if (theme.defaultVariant === undefined) {
        return true
      }
      return theme.variants[theme.defaultVariant] !== undefined
    },
    {
      message: '`defaultVariant` must point at a variant declared in `variants`',
      path: ['defaultVariant'],
    }
  )

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
 * brand surface so `RSPRESS_COMPAT_MAP` can pick them up by token path.
 */
const BRAND_PALETTES: Readonly<Record<BuiltInThemeName, RawBrandPalette>> = Object.freeze({
  default: {
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
 * Precomputed `[path, cssVar, segments]` triples for every leaf token path.
 *
 * `renderDeclaration` runs once per token per theme per build — splitting the
 * dotted path on every call is wasted allocation. Splitting once at module
 * load lets the hot path read three already-resolved values per declaration.
 */
const TOKEN_RENDER_PLAN: readonly {
  readonly path: keyof typeof TOKEN_TO_CSS_VAR
  readonly cssVar: string
  readonly segments: readonly string[]
}[] = Object.freeze(
  TOKEN_PATHS.map((path) =>
    Object.freeze({
      path,
      cssVar: TOKEN_TO_CSS_VAR[path],
      segments: Object.freeze((path as string).split('.')),
    })
  )
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
 * Full mapping of Rspress (`--rp-*`) CSS variables to the zpress token path
 * that supplies each value. Emitted by `themeToCss` after the canonical
 * `--zp-*` declaration block so every Rspress internal component reads
 * from the zpress design system — Rspress is an implementation detail,
 * zpress tokens are the canonical surface.
 *
 * Grouped by category for readability. New rspress vars should be added
 * here when they appear; rspress vars that map to a missing concept can
 * stay unmapped (rspress's default value remains in force).
 *
 * Surfaces — every page surface flattens to the single `bg` token so the
 * doc layout, sidebar drawer, and home page share one base color.
 * Elevated surfaces (cards, hero panels) keep using `--zp-c-bg-elv` /
 * `--zp-c-bg-soft` directly inside our own component CSS.
 *
 *   --rp-c-bg                 surface.bg
 *   --rp-c-bg-alt             surface.bgAlt        (subtle stripe surfaces)
 *   --rp-c-bg-dark            surface.gutter       (deepest band — footer/header)
 *   --rp-c-bg-mute            surface.bg           (flattened — was bgElv pre-v1)
 *   --rp-c-bg-soft            surface.bgSoft
 *
 * Brand —
 *
 *   --rp-c-brand              brand.primary
 *   --rp-c-brand-light        brand.light
 *   --rp-c-brand-lighter      brand.lighter
 *   --rp-c-brand-dark         brand.hover
 *   --rp-c-brand-darker       brand.active
 *   --rp-c-brand-tint         brand.soft
 *
 * Borders / dividers —
 *
 *   --rp-c-divider            border.divider
 *   --rp-c-divider-dark       border.border       (stronger stroke)
 *   --rp-c-divider-light      border.divider      (same as base)
 *
 * Links —
 *
 *   --rp-c-link               brand.primary
 *
 * Text —
 *
 *   --rp-c-text-1             text.text1
 *   --rp-c-text-2             text.text2
 *   --rp-c-text-3             text.text3
 *   --rp-c-text-4             text.text3          (no `text4` token; alias)
 *   --rp-c-text-code          text.text1
 *
 * Code blocks —
 *
 *   --rp-code-block-bg        surface.codeBlockBg
 *
 * Home —
 *
 *   --rp-home-background-bg          surface.homeBg
 *   --rp-home-feature-bg             surface.bgSoft
 *   --rp-home-hero-secondary-color   text.text2
 *   --rp-home-hero-title-color       text.text1
 *
 * Intentionally unmapped (rspress defaults remain in force):
 *  - `--rp-c-brand-rgb`: needs `r, g, b` tuple, no equivalent token
 *  - `--rp-c-gray*`: rspress internal neutrals, low surface area
 *  - `--rp-container-*` (admonitions): styled by zpress's own MDX overrides
 *  - `--rp-c-overview-group-*`: superseded by our SectionCard component
 *  - `--rp-code-block-border|color|shadow`, `--rp-code-title-*`,
 *    `--rp-code-line-highlight-color`: rspress's shiki defaults are fine
 *  - `--rp-banner-background`: we don't use rspress's banner
 *  - Layout/size/z-index vars: zpress sets these via `--zp-*` directly on
 *    its own components; rspress's layout chrome uses its own defaults
 */
const RSPRESS_COMPAT_MAP: Readonly<Record<string, TokenPath>> = Object.freeze({
  '--rp-c-bg': 'colors.surface.bg',
  '--rp-c-bg-alt': 'colors.surface.bgAlt',
  '--rp-c-bg-dark': 'colors.surface.gutter',
  '--rp-c-bg-mute': 'colors.surface.bg',
  '--rp-c-bg-soft': 'colors.surface.bgSoft',
  '--rp-c-brand': 'colors.brand.primary',
  '--rp-c-brand-light': 'colors.brand.light',
  '--rp-c-brand-lighter': 'colors.brand.lighter',
  '--rp-c-brand-dark': 'colors.brand.hover',
  '--rp-c-brand-darker': 'colors.brand.active',
  '--rp-c-brand-tint': 'colors.brand.soft',
  '--rp-c-divider': 'colors.border.divider',
  '--rp-c-divider-dark': 'colors.border.border',
  '--rp-c-divider-light': 'colors.border.divider',
  '--rp-c-link': 'colors.brand.primary',
  '--rp-c-text-1': 'colors.text.text1',
  '--rp-c-text-2': 'colors.text.text2',
  '--rp-c-text-3': 'colors.text.text3',
  '--rp-c-text-4': 'colors.text.text3',
  '--rp-c-text-code': 'colors.text.text1',
  '--rp-code-block-bg': 'colors.surface.codeBlockBg',
  '--rp-home-background-bg': 'colors.surface.homeBg',
  '--rp-home-feature-bg': 'colors.surface.bgSoft',
  '--rp-home-hero-secondary-color': 'colors.text.text2',
  '--rp-home-hero-title-color': 'colors.text.text1',
})

/**
 * Declared-order list of `--rp-*` keys for deterministic emission ordering.
 */
const RSPRESS_COMPAT_VAR_NAMES: readonly string[] = Object.freeze(Object.keys(RSPRESS_COMPAT_MAP))

/**
 * Shared OpenAPI / OAS badge palette — light-mode values from the
 * `default` theme. Midnight and arcade override the entire set via
 * their own constants.
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
 * Shared semantic palette — derived from the `default` theme's light
 * variant. OpenAPI method colors are the canonical semantic source for
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
  // Hero title — kept in-hue. The previous multi-stop brand → cyan → purple
  // gradient read as a generic AI landing-page accent; restraining to the
  // brand family makes the hero feel like a real product, not a template.
  heroTitle: 'linear-gradient(135deg, var(--zp-c-brand-1), var(--zp-c-brand-light))',
} as const

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Legacy alias for {@link ThemeVariant}. Retained inside `@zpress/theme`
 * for one-version migration safety. Removed from `@zpress/core`,
 * `@zpress/config`, and `@zpress/kit` public exports in v1 — new code
 * should import `ThemeVariant` directly.
 *
 * @deprecated Use {@link ThemeVariant}.
 */
export type ThemeMode = ThemeVariant

/**
 * Variant-keyed token map. A theme that supports both modes declares both
 * keys; a dark-only theme declares only `dark`.
 */
export interface ThemeVariantTokens {
  readonly dark?: ZpressTokens
  readonly light?: ZpressTokens
}

/**
 * Fully resolved theme definition produced by `defineTheme`.
 *
 * A `ZpressTheme` represents one brand identity with one or more variant
 * token trees. The CSS emitter renders a separate
 * `html[data-zp-theme='{name}'][data-zp-variant='{variant}']` block per
 * variant present in `variants`.
 */
export interface ZpressTheme {
  /**
   * Identifier — used in the `html[data-zp-theme='{name}']` selector.
   * Must be a lowercase slug (validated by `themeNameSchema`).
   */
  readonly name: string
  /**
   * Validated, frozen token trees keyed by variant. `variants.dark` and
   * `variants.light` are both optional, but at least one must be present.
   */
  readonly variants: ThemeVariantTokens
  /**
   * Variant to render when no localStorage preference is set. Must point
   * at a variant present in `variants`.
   */
  readonly defaultVariant: ThemeVariant
}

/**
 * Input shape accepted by `defineTheme`. Variant token trees are typed
 * `unknown` because validation is the factory's responsibility — callers
 * may pass raw JSON or a partially-typed object and let Zod produce a
 * clear error.
 */
export interface ZpressThemeInputVariants {
  readonly dark?: unknown
  readonly light?: unknown
}

export interface ZpressThemeInput {
  /**
   * Identifier — must match `html[data-zp-theme='{name}']`.
   */
  readonly name: string
  /**
   * Variant token trees. At least one of `variants.dark` /
   * `variants.light` must be present; both are validated against
   * `tokensSchema` at factory time.
   */
  readonly variants: ZpressThemeInputVariants
  /**
   * Variant to render initially. Falls back to `'dark'` when both
   * variants are declared, otherwise to the only declared variant.
   */
  readonly defaultVariant?: ThemeVariant
}

/**
 * Validate a theme definition through `tokensSchema` and return a deeply
 * frozen `ZpressTheme`.
 *
 * Validation failures surface as `ZodError`s from `tokensSchema.parse` and
 * `themeNameSchema.parse` — that's the documented contract callers need
 * to handle. Successful calls return a frozen object tree.
 *
 * @param input - Theme definition (name + variant token trees)
 * @returns A frozen, fully-typed `ZpressTheme`
 *
 * @example
 * const myTheme = defineTheme({
 *   name: 'sunset',
 *   variants: {
 *     dark: { ...allTokens },
 *   },
 * })
 */
export function defineTheme(input: ZpressThemeInput): ZpressTheme {
  // Envelope validation first — name shape, at-least-one variant, and
  // `defaultVariant` cross-reference. Failures surface as `ZodError`s
  // with stable paths (`variants`, `defaultVariant`, etc.).
  const envelope = themeInputEnvelopeSchema.parse(input)
  const validatedName: string = themeNameSchema.parse(envelope.name)
  const variants: Record<ThemeVariant, ZpressTokens | undefined> = {
    dark: validateVariant(envelope.variants.dark),
    light: validateVariant(envelope.variants.light),
  }
  const presentVariants: readonly ThemeVariant[] = DEFAULT_VARIANT_ORDER.filter(
    (v) => variants[v] !== undefined
  )
  const defaultVariant: ThemeVariant = pickInputDefaultVariant(
    envelope.defaultVariant,
    presentVariants
  )
  return freezeTheme({
    name: validatedName,
    variants: filterPresentVariants(variants),
    defaultVariant,
  })
}

/**
 * Render a `ZpressTheme` to a deterministic CSS source covering every
 * variant the theme declares.
 *
 * For each variant V in `theme.variants` the emitter writes one
 * `html[data-zp-theme='{name}'][data-zp-variant='{V}']` block. Iteration
 * order is fixed by `TOKEN_TO_CSS_VAR` (then `RSPRESS_COMPAT_MAP`) so the
 * output is byte-deterministic given the same input.
 *
 * The default theme additionally emits a `:root { ... }` FOUC block that
 * mirrors its default variant — the browser applies it before JS hydrates
 * the `data-zp-*` attributes on `<html>`.
 *
 * @param theme - Theme to render
 * @returns CSS source containing one block per variant
 */
export function themeToCss(theme: ZpressTheme): string {
  return renderThemeCss(theme)
}

/**
 * The three first-party themes shipped with zpress.
 *
 *  - `default` is the brand-purple theme and ships both `dark` and
 *    `light` variants. The sun/moon toggle swaps between them.
 *  - `midnight` is an opinionated near-black blue theme — dark only.
 *  - `arcade` is a neon green retro theme — dark only.
 *
 * Built-in token trees are lifted from
 * `packages/ui/src/theme/styles/themes/*.css` plus
 * `packages/ui/src/theme/styles/overrides/tokens.css`. The registry is
 * the single source of truth from this point forward — generated CSS is
 * produced by `packages/ui/scripts/generate-theme-css.mjs`.
 */
export const BUILT_IN_THEMES: Readonly<Record<BuiltInThemeName, ZpressTheme>> = Object.freeze({
  default: defineTheme({
    name: 'default',
    variants: {
      dark: buildDefaultDarkTokens(),
      light: buildDefaultLightTokens(),
    },
    defaultVariant: 'dark',
  }),
  midnight: defineTheme({
    name: 'midnight',
    variants: { dark: buildMidnightTokens() },
    defaultVariant: 'dark',
  }),
  arcade: defineTheme({
    name: 'arcade',
    variants: { dark: buildArcadeTokens() },
    defaultVariant: 'dark',
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
 * Resolve a precomputed segment array against a `ZpressTokens` tree.
 *
 * Walks the segments with `.reduce`, never mutates intermediate state, and
 * trusts the `TokenPath` literal union — if a path resolves to `undefined`,
 * the registry itself is malformed, not the input.
 *
 * @private
 * @param segments - Pre-split token path (e.g. `['colors', 'brand', 'primary']`)
 * @param tokens - Token tree to walk
 * @returns The leaf value (string or number) at the resolved path
 */
function resolveBySegments(segments: readonly string[], tokens: ZpressTokens): string | number {
  const value = segments.reduce<unknown>(
    (node, segment) => (node as Record<string, unknown>)[segment],
    tokens
  )
  return value as string | number
}

/**
 * Render a single `  --zp-*: value;` line for one precomputed token entry.
 *
 * @private
 * @param entry - Precomputed render plan entry (cssVar + segments)
 * @param tokens - Token tree containing the value
 * @returns CSS declaration line (no trailing newline)
 */
function renderDeclaration(
  entry: { readonly cssVar: string; readonly segments: readonly string[] },
  tokens: ZpressTokens
): string {
  const value = resolveBySegments(entry.segments, tokens)
  return `  ${entry.cssVar}: ${value};`
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
  const path = RSPRESS_COMPAT_MAP[cssVar] as TokenPath
  const value = resolveBySegments((path as string).split('.'), tokens)
  return `  ${cssVar}: ${value};`
}

/**
 * Render the full declaration body — all `--zp-*` tokens in registry order
 * followed by every `--rp-*` compatibility var in `RSPRESS_COMPAT_MAP` order.
 *
 * @private
 * @param tokens - Token tree to render
 * @returns Multi-line CSS body (no surrounding braces)
 */
function renderDeclarationBody(tokens: ZpressTokens): string {
  const zpLines = TOKEN_RENDER_PLAN.map((entry) => renderDeclaration(entry, tokens))
  const rpLines = RSPRESS_COMPAT_VAR_NAMES.map((name) => renderRpDeclaration(name, tokens))
  return [...zpLines, ...rpLines].join('\n')
}

/**
 * Render the complete CSS for a theme. Emits one
 * `html[data-zp-theme='{name}'][data-zp-variant='{V}']` block per
 * variant present on the theme. The framework's default theme
 * (`FOUC_ROOT_THEME_NAME`) additionally emits a `:root { ... }` FOUC
 * fallback block for its default variant.
 *
 * @private
 * @param theme - Theme to render
 * @returns CSS source containing one block per variant (plus optional FOUC root)
 */
function renderThemeCss(theme: ZpressTheme): string {
  const variantBlocks = DEFAULT_VARIANT_ORDER.flatMap((variant) =>
    renderVariantBlock(theme, variant)
  )
  if (theme.name !== FOUC_ROOT_THEME_NAME) {
    return variantBlocks.join('\n')
  }
  const defaultTokens = theme.variants[theme.defaultVariant]
  if (defaultTokens === undefined) {
    return variantBlocks.join('\n')
  }
  const rootBlock = `:root {\n${renderDeclarationBody(defaultTokens)}\n}\n`
  return `${rootBlock}\n${variantBlocks.join('\n')}`
}

/**
 * Render the per-variant CSS block for one variant of one theme. Returns
 * an empty array when the theme does not declare the given variant so the
 * caller can `flatMap` without filtering.
 *
 * @private
 * @param theme - Theme being rendered
 * @param variant - Variant to render (`'dark'` or `'light'`)
 * @returns Single-element array on hit, empty array on miss
 */
function renderVariantBlock(theme: ZpressTheme, variant: ThemeVariant): readonly string[] {
  const tokens = theme.variants[variant]
  if (tokens === undefined) {
    return []
  }
  const body = renderDeclarationBody(tokens)
  return [`html[data-zp-theme='${theme.name}'][data-zp-variant='${variant}'] {\n${body}\n}\n`]
}

/**
 * Validate one variant's token tree, returning `undefined` when the
 * caller omitted that variant.
 *
 * @private
 * @param raw - Raw token tree from `defineTheme` input
 * @returns Validated frozen tokens, or `undefined` when no input was given
 */
function validateVariant(raw: unknown): ZpressTokens | undefined {
  if (raw === undefined) {
    return undefined
  }
  return tokensSchema.parse(raw) as ZpressTokens
}

/**
 * Choose the default variant for `defineTheme` input, falling back to
 * the first declared variant in `DEFAULT_VARIANT_ORDER` when the caller
 * omitted `defaultVariant`. Cross-reference of `defaultVariant` against
 * `present` already runs in `themeInputEnvelopeSchema`, so this helper
 * trusts its inputs.
 *
 * Renamed from `resolveDefaultVariant` so it doesn't shadow the
 * identically named public export in `definitions.ts`.
 *
 * @private
 * @param requested - Validated default variant (may be `undefined`)
 * @param present - Variants the theme actually declares
 * @returns Resolved default variant
 */
function pickInputDefaultVariant(
  requested: ThemeVariant | undefined,
  present: readonly ThemeVariant[]
): ThemeVariant {
  if (requested !== undefined) {
    return requested
  }
  return present[0] as ThemeVariant
}

/**
 * Drop `undefined` keys from the variant map so consumers can `Object.keys`
 * the result to enumerate present variants.
 *
 * @private
 * @param variants - Raw variant map possibly containing `undefined` values
 * @returns Frozen variant map containing only declared variants
 */
function filterPresentVariants(
  variants: Record<ThemeVariant, ZpressTokens | undefined>
): ThemeVariantTokens {
  const entries = (Object.entries(variants) as readonly [ThemeVariant, ZpressTokens | undefined][])
    .filter(([, t]) => t !== undefined)
    .map(([k, t]) => [k, t as ZpressTokens] as const)
  return Object.freeze(Object.fromEntries(entries)) as ThemeVariantTokens
}

/**
 * Freeze the outer `ZpressTheme` shell plus each variant's nested token
 * tree. Returns the same references rather than cloning — inputs come
 * from literal object expressions that are not aliased anywhere else.
 *
 * @private
 * @param theme - Theme to freeze
 * @returns Same theme, deeply frozen
 */
function freezeTheme(theme: ZpressTheme): ZpressTheme {
  const frozenVariants = Object.fromEntries(
    Object.entries(theme.variants).map(([k, tokens]) => [k, deepFreeze(tokens as ZpressTokens)])
  ) as ThemeVariantTokens
  return Object.freeze({
    name: theme.name,
    variants: Object.freeze(frozenVariants),
    defaultVariant: theme.defaultVariant,
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
 * Build the `light` variant of the `default` theme — bright surfaces
 * with the brand-purple palette.
 *
 * @private
 * @returns Untyped token object suitable for `tokensSchema.parse`
 */
function buildDefaultLightTokens(): ParsedTokens {
  const brand = BRAND_PALETTES.default
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
 * Build the `dark` variant of the `default` theme — same brand-purple
 * palette as the light variant, paired with dark surfaces and inverted
 * text. This is the variant zpress renders by default (the framework
 * treats dark as its baseline aesthetic).
 *
 * @private
 * @returns Untyped token object suitable for `tokensSchema.parse`
 */
function buildDefaultDarkTokens(): ParsedTokens {
  const brand = BRAND_PALETTES.default
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
        bg: '#0a0a0a',
        bgAlt: '#0f0f0f',
        bgElv: '#161616',
        bgSoft: '#1c1c1c',
        bgIcon: '#2a2a2a',
        homeBg: '#0a0a0a',
        overlayFaint: 'rgba(255, 255, 255, 0.06)',
        gutter: '#0f0f0f',
        codeBlockBg: '#141414',
      },
      text: {
        text1: '#f5f5f5',
        text2: 'rgba(245, 245, 245, 0.72)',
        text3: 'rgba(245, 245, 245, 0.48)',
      },
      border: {
        border: '#2a2a2a',
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
      oas: { ...SHARED_OAS_COLORS_BASE },
      button: {
        brand: {
          bg: '#7c3aed',
          hoverBg: '#8b5cf6',
          activeBg: '#6d28d9',
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
