import type {
  ThemeConfig,
  ThemeName,
  ColorMode,
  ThemeColors,
  IconColor,
  ZpressThemeInput,
} from '@zpress/theme'

export type {
  ThemeConfig,
  ThemeName,
  ColorMode,
  ThemeColors,
  IconColor,
  ZpressThemeInput,
} from '@zpress/theme'

/**
 * Installed Iconify icon-set prefixes.
 *
 * Must stay in sync with `@iconify-json/*` packages in root `package.json`.
 */
export type IconPrefix =
  | 'catppuccin'
  | 'devicon'
  | 'logos'
  | 'material-icon-theme'
  | 'mdi'
  | 'pixelarticons'
  | 'simple-icons'
  | 'skill-icons'
  | 'vscode-icons'

/**
 * Iconify icon identifier — `"prefix:name"` where prefix matches an installed set.
 *
 * @example `"devicon:hono"`, `"pixelarticons:device-mobile"`
 * @see https://icon-sets.iconify.design/
 */
export type IconId = `${IconPrefix}:${string}`

/**
 * Unified icon configuration.
 *
 * Accepts either:
 * - **String**: Iconify identifier (e.g. `"devicon:hono"`, `"pixelarticons:device-mobile"`)
 *   - Color defaults to purple (first in rotation)
 *   - Find icons at https://icon-sets.iconify.design/
 * - **Object**: `{ id: IconId, color: IconColor }`
 *   - Explicit color from 8-color palette
 *
 * Auto-generated section cards rotate through these colors:
 * purple → blue → green → amber → cyan → red → pink → slate
 *
 * @example
 * ```ts
 * icon: 'devicon:react'  // Uses purple (default)
 * icon: { id: 'devicon:nextjs', color: 'blue' }  // Explicit blue
 * ```
 */
export type IconConfig = IconId | { readonly id: IconId; readonly color: IconColor }

/**
 * File-system path (absolute or relative).
 */
type FilePath = string

/**
 * URL path segment (e.g. `"/api"`, `"/guides/auth"`).
 */
type UrlPath = string

/**
 * Result type for error handling without exceptions.
 *
 * Success: `[null, value]`
 * Failure: `[error, null]`
 *
 * @example
 * ```ts
 * const [error, value] = loadConfig(path)
 * if (error) return [error, null]
 * ```
 */
export type Result<T, E = Error> = readonly [E, null] | readonly [null, T]

/**
 * Rspress frontmatter fields injectable at build time.
 *
 * Schema: `frontmatterSchema` in schema.ts validates this shape.
 * The index signature allows arbitrary extra fields (schema uses `.passthrough()`).
 */
export interface Frontmatter {
  readonly title?: string
  readonly titleTemplate?: string | boolean
  readonly description?: string
  readonly layout?: string
  readonly sidebar?: boolean
  readonly aside?: boolean | 'left'
  readonly outline?: false | number | [number, number] | 'deep'
  readonly navbar?: boolean
  readonly editLink?: boolean
  readonly lastUpdated?: boolean
  readonly footer?: boolean
  readonly pageClass?: string
  readonly head?: readonly [string, Record<string, string>][]
  readonly [key: string]: unknown
}

/**
 * Navigation item for the top nav bar.
 *
 * Schema: `navItemSchema` in schema.ts validates this shape.
 * The schema uses `z.ZodType<NavItem>` to enforce consistency.
 */
export interface NavItem {
  readonly title: string
  readonly link?: string
  readonly items?: readonly NavItem[]
  readonly activeMatch?: string
}

/**
 * Title configuration — static or derived from source files.
 *
 * Schema: `titleConfigSchema` in schema.ts validates this shape.
 *
 * **Static title**:
 * ```ts
 * title: "Getting Started"
 * ```
 *
 * **Derived title**:
 * ```ts
 * title: { from: 'auto', transform: (text, slug) => text.toUpperCase() }
 * ```
 */
export type TitleConfig =
  | string
  | {
      /**
       * Title derivation strategy for auto-discovered children.
       * - `"auto"` (default) — frontmatter > heading > filename fallback chain
       * - `"filename"` — kebab-to-title from filename only
       * - `"heading"` — first `# heading` in the file only
       * - `"frontmatter"` — `title` field from YAML frontmatter only
       */
      readonly from: 'auto' | 'filename' | 'heading' | 'frontmatter'
      /**
       * Transform function applied after derivation.
       * @param text - The derived title
       * @param slug - The filename slug (without extension)
       * @returns Transformed title for sidebar display
       */
      readonly transform?: (text: string, slug: string) => string
    }

/**
 * Controls how an entry appears as a card on its parent section's
 * auto-generated landing page.
 *
 * Schema: `cardConfigSchema` in schema.ts validates this shape.
 * A compile-time guard in schema.ts ensures these stay in sync.
 *
 * @example
 * ```ts
 * card: {
 *   icon: 'devicon:hono',
 *   scope: 'apps/',
 *   description: 'Hono REST API with RPC-typed routes',
 *   tags: ['Hono', 'REST', 'Serverless'],
 *   badge: { src: '/logos/vercel.svg', alt: 'Vercel' },
 * }
 * ```
 */
export interface CardConfig {
  readonly icon?: IconConfig
  readonly scope?: string
  readonly description?: string
  readonly tags?: readonly string[]
  readonly badge?: { readonly src: string; readonly alt: string }
}

/**
 * A single call-to-action button on the home page hero.
 *
 * Schema: `heroActionSchema` in schema.ts validates this shape.
 */
export interface HeroAction {
  readonly theme: 'brand' | 'alt'
  readonly text: string
  readonly link: string
}

/**
 * A persistent link rendered above or below the sidebar nav tree.
 *
 * Schema: `sidebarLinkSchema` in schema.ts validates this shape.
 */
export interface SidebarLink {
  readonly text: string
  readonly link: string
  readonly icon?: IconConfig
  readonly style?: 'brand' | 'alt' | 'ghost'
  readonly shape?: 'square' | 'rounded' | 'circle'
}

/**
 * Sidebar configuration.
 *
 * Schema: `sidebarConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * sidebar: {
 *   above: [
 *     { text: 'Home', link: '/', icon: 'pixelarticons:home' },
 *   ],
 *   below: [
 *     { text: 'GitHub', link: 'https://github.com/...', icon: 'pixelarticons:github' },
 *     { text: 'Discord', link: 'https://discord.gg/...', icon: 'pixelarticons:message' },
 *   ],
 * }
 * ```
 */
export interface SidebarConfig {
  readonly above?: readonly SidebarLink[]
  readonly below?: readonly SidebarLink[]
}

/**
 * A single node in the information architecture (sidebar/nav tree).
 *
 * Schema: `entrySchema` in schema.ts validates this shape.
 * The schema uses `z.ZodType<Section>` to enforce consistency.
 *
 * **Page — explicit file**:
 * ```ts
 * { title: 'Architecture', path: '/architecture', include: 'docs/architecture.md' }
 * ```
 *
 * **Page — inline/generated content**:
 * ```ts
 * { title: 'Overview', path: '/api/overview', content: '# API Overview\n...' }
 * ```
 *
 * **Section — explicit children**:
 * ```ts
 * { title: 'Guides', items: [ ... ] }
 * ```
 *
 * **Section — auto-discovered from glob**:
 * ```ts
 * { title: 'Guides', path: '/guides', include: 'docs/guides/*.md' }
 * ```
 */
export interface Section {
  readonly title: TitleConfig
  readonly description?: string
  readonly path?: string
  readonly include?: string | readonly string[]
  readonly content?: string | (() => string | Promise<string>)
  readonly items?: readonly Section[]
  readonly landing?: boolean
  readonly collapsible?: boolean
  readonly exclude?: readonly string[]
  readonly hidden?: boolean
  readonly frontmatter?: Frontmatter
  readonly sort?:
    | 'default'
    | 'alpha'
    | 'filename'
    | 'none'
    | ((a: ResolvedPage, b: ResolvedPage) => number)
  readonly recursive?: boolean
  readonly entryFile?: string
  readonly icon?: IconConfig
  readonly card?: CardConfig
  readonly standalone?: boolean
  readonly root?: boolean
}

/**
 * Workspace item representing an app or package in the monorepo.
 *
 * Schema: `workspaceItemSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * {
 *   title: 'API',
 *   icon: 'devicon:hono',
 *   description: 'Hono REST API serving all client applications',
 *   tags: ['hono', 'react', 'vercel'],
 *   path: '/apps/api',
 *   include: 'docs/*.md',
 *   sort: 'alpha',
 * }
 * ```
 */
export interface Workspace {
  readonly title: string
  readonly icon?: IconConfig
  readonly description: string
  readonly tags?: readonly string[]
  readonly badge?: { readonly src: string; readonly alt: string }
  readonly path: string
  readonly include?: string | readonly string[]
  readonly items?: readonly Section[]
  readonly sort?:
    | 'default'
    | 'alpha'
    | 'filename'
    | 'none'
    | ((a: ResolvedPage, b: ResolvedPage) => number)
  readonly exclude?: readonly string[]
  readonly recursive?: boolean
  readonly entryFile?: string
  readonly frontmatter?: Frontmatter
  readonly openapi?: OpenAPIConfig
}

/**
 * Custom workspace category grouping apps/packages.
 *
 * Schema: `workspaceGroupSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * {
 *   title: 'Integrations',
 *   description: 'Third-party service connectors',
 *   icon: 'mdi:puzzle',
 *   items: [
 *     { title: 'Stripe', description: 'Payment processing', path: '/integrations/stripe' },
 *   ],
 * }
 * ```
 */
export interface WorkspaceCategory {
  readonly title: string
  readonly description?: string
  readonly icon: IconId
  readonly items: readonly Workspace[]
  readonly link?: string
}

/**
 * A fully resolved page after the sync engine processes the config.
 */
export interface ResolvedPage {
  readonly title: string
  readonly link: string
  readonly source?: string
  readonly frontmatter: Frontmatter
}

/**
 * A fully resolved section.
 */
export interface ResolvedSection {
  readonly title: string
  readonly link?: string
  readonly collapsible?: boolean
  readonly items: readonly (ResolvedPage | ResolvedSection)[]
}

/**
 * Configuration for OpenAPI spec integration.
 */
export interface OpenAPIConfig {
  /**
   * Path to openapi.json relative to repo root.
   */
  readonly spec: FilePath
  /**
   * URL path for API operation pages (e.g., '/api').
   */
  readonly path: UrlPath
  /**
   * Sidebar group title.
   * @default 'API Reference'
   */
  readonly title?: string
  /**
   * How operations appear in the sidebar.
   *
   * - `'method-path'` — shows `GET /users` with method badge and path in code font
   * - `'title'` — shows the operation summary (e.g., "List Users")
   *
   * @default 'method-path'
   */
  readonly sidebarLayout?: 'method-path' | 'title'
}

/**
 * Explicit feature card for the home page.
 *
 * Schema: `featureSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * {
 *   title: 'Getting Started',
 *   description: 'Everything you need to set up and start building.',
 *   link: '/getting-started',
 *   icon: 'pixelarticons:speed-fast',
 * }
 * ```
 */
export interface Feature {
  readonly title: string
  readonly description: string
  readonly link?: string
  readonly icon?: IconConfig
}

/**
 * Text truncation configuration for card content.
 *
 * Values represent the maximum number of visible lines before
 * overflow is clipped with an ellipsis via CSS `line-clamp`.
 */
export interface TruncateConfig {
  readonly title?: number
  readonly description?: number
}

/**
 * Layout and styling options for a card grid section on the home page.
 */
export interface HomeGridConfig {
  readonly columns?: 1 | 2 | 3 | 4
  readonly truncate?: TruncateConfig
}

/**
 * Trust strip on the home hero — short lead followed by a list of names.
 *
 * Schema: `trustConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * trust: { lead: 'Trusted by teams at', names: ['Acme', 'Globex', 'Initech'] }
 * ```
 */
export interface HomeTrustConfig {
  readonly lead?: string
  readonly names?: readonly string[]
}

/**
 * Final CTA band on the home page — title, optional subtitle, and up to two actions.
 *
 * Schema: `ctaConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * cta: {
 *   title: 'Ready to ship?',
 *   subtitle: 'Install zpress and write your first page in five minutes.',
 *   actions: [{ theme: 'brand', text: 'Quick start', link: '/getting-started' }],
 * }
 * ```
 */
export interface HomeCtaConfig {
  readonly title?: string
  readonly subtitle?: string
  readonly actions?: readonly HeroAction[]
}

/**
 * Home page layout customization.
 *
 * Schema: `homeConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * home: {
 *   eyebrow: 'v1.0',
 *   features: { columns: 3, truncate: { description: 2 } },
 *   workspaces: { columns: 2, truncate: { title: 1, description: 2 } },
 *   trust: { lead: 'Used by', names: ['Acme', 'Globex'] },
 *   cta: { title: 'Ready to ship?', actions: [...] },
 * }
 * ```
 */
export interface HomeConfig {
  readonly features?: HomeGridConfig
  readonly workspaces?: HomeGridConfig
  /**
   * Eyebrow text shown above the hero title (e.g. version chip).
   */
  readonly eyebrow?: string
  /**
   * Trust strip rendered between the hero and the features grid.
   */
  readonly trust?: HomeTrustConfig
  /**
   * Final CTA band rendered just above the footer.
   */
  readonly cta?: HomeCtaConfig
}

/**
 * Built-in social link icon identifier.
 *
 * Rspress supports these icons out of the box via `virtual-social-links`.
 */
export type SocialLinkIcon =
  | 'lark'
  | 'discord'
  | 'facebook'
  | 'github'
  | 'instagram'
  | 'linkedin'
  | 'slack'
  | 'x'
  | 'youtube'
  | 'wechat'
  | 'qq'
  | 'juejin'
  | 'zhihu'
  | 'bilibili'
  | 'weibo'
  | 'gitlab'
  | 'X'
  | 'bluesky'
  | 'npm'

/**
 * A social link shown in the navigation bar.
 *
 * Schema: `socialLinkSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * socialLinks: [
 *   { icon: 'github', mode: 'link', content: 'https://github.com/acme' },
 *   { icon: 'discord', mode: 'link', content: 'https://discord.gg/acme' },
 * ]
 * ```
 */
export interface SocialLink {
  readonly icon: SocialLinkIcon | { readonly svg: string }
  readonly mode: 'link' | 'text' | 'img' | 'dom'
  readonly content: string
}

/**
 * Site footer shown below all page content.
 *
 * Schema: `footerConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * footer: {
 *   message: 'Built with zpress',
 *   copyright: 'Copyright © 2025 Acme Inc.',
 * }
 * ```
 */
export interface FooterConfig {
  readonly message?: string
  readonly copyright?: string
  readonly socials?: boolean
}

/**
 * Announcement banner rendered above the topbar.
 *
 * Schema: `announcementConfigSchema` in schema.ts validates this shape.
 *
 * @example
 * ```ts
 * site: {
 *   announcement: {
 *     id: 'v1-launch',
 *     lead: 'NEW',
 *     message: 'zpress 1.0 is out.',
 *     cta: { href: '/changelog', label: 'See changes' },
 *   },
 * }
 * ```
 */
export interface AnnouncementConfig {
  /**
   * Stable id — when present, dismissal persists in localStorage.
   */
  readonly id?: string
  /**
   * Highlighted lead phrase rendered before the message (e.g. "NEW").
   */
  readonly lead?: string
  /**
   * Body text of the announcement.
   */
  readonly message: string
  /**
   * Optional call-to-action link appended after the message.
   */
  readonly cta?: {
    readonly href: string
    readonly label: string
  }
  /**
   * When `true`, hides the dismiss button.
   */
  readonly persistent?: boolean
}

/**
 * Edit-this-page link configuration. Renders an "Edit on GitHub"-style
 * action under every doc page when set.
 */
export interface SiteEditConfig {
  /**
   * Destination repository (e.g. `'acme/docs'`) or full URL template.
   * The string `{path}` is substituted with the current page's relative path.
   */
  readonly repo: string
  /**
   * Branch to link against. Defaults to `'main'`.
   */
  readonly branch?: string
  /**
   * Subdirectory inside the repo containing the docs. Defaults to repo root.
   */
  readonly directory?: string
  /**
   * Override the visible label. Defaults to `'Edit this page on GitHub'`.
   */
  readonly label?: string
}

/**
 * Report-an-issue link configuration. Renders an action under every doc
 * page when set.
 */
export interface SiteReportConfig {
  /**
   * Destination repository (e.g. `'acme/docs'`) or full URL.
   */
  readonly repo: string
  /**
   * Override the visible label. Defaults to `'Report an issue'`.
   */
  readonly label?: string
}

/**
 * Sidebar promo card rendered at the bottom of the docs sidebar.
 */
export interface SiteSidebarPromoConfig {
  readonly title: string
  readonly body: string
  readonly cta: {
    readonly text: string
    readonly href: string
  }
}

/**
 * Call-to-action button rendered on the topbar (and in the mobile nav).
 */
export interface SiteCtaConfig {
  readonly text: string
  readonly href: string
}

/**
 * One column of footer links in the site footer grid.
 */
export interface SiteFooterColumn {
  readonly heading: string
  readonly links: readonly {
    readonly text: string
    readonly href: string
  }[]
}

/**
 * Extended footer configuration for the column-based site footer.
 * The simple `message` / `copyright` / `socials` fields live on the
 * top-level `footer` config (`FooterConfig`).
 */
export interface SiteFooterConfig {
  /**
   * Link columns rendered in the footer grid. When omitted, the footer
   * renders only the brand block and bottom strip.
   */
  readonly columns?: readonly SiteFooterColumn[]
  /**
   * Small tagline rendered on the right side of the bottom strip.
   */
  readonly tagline?: string
  /**
   * Brand mark character rendered in the footer's brand block.
   * Defaults to `'Z'`.
   */
  readonly brandMark?: string
}

/**
 * Site-level configuration for the chrome that wraps every page —
 * version chip, edit/report links, sidebar promo, topbar CTA,
 * announcement bar, and extended footer columns.
 *
 * Every field is optional; pieces with no config render nothing so a
 * minimal `defineConfig({ sections: [...] })` produces a clean site
 * with no leftover framework branding.
 *
 * @example
 * ```ts
 * site: {
 *   version: 'v1.0',
 *   edit:   { repo: 'acme/docs', branch: 'main' },
 *   report: { repo: 'acme/docs' },
 *   sidebarPromo: {
 *     title: 'Try Acme Cloud',
 *     body:  'Hosted Acme in two clicks.',
 *     cta:   { text: 'Start free', href: 'https://acme.io' },
 *   },
 *   topbarCta: { text: 'Get started →', href: '/getting-started' },
 *   announcement: {
 *     id: 'v1',
 *     lead: 'NEW',
 *     message: 'Acme Docs 1.0 is here.',
 *     cta: { href: '/changelog', label: 'What changed' },
 *   },
 *   footer: {
 *     columns: [
 *       { heading: 'Product', links: [...] },
 *       { heading: 'Community', links: [...] },
 *     ],
 *     tagline: 'Built with zpress',
 *   },
 * }
 * ```
 */
export interface SiteConfig {
  /**
   * Version label rendered next to the brand in the topbar (e.g. `'v1.0'`).
   * When omitted, no version chip is rendered.
   */
  readonly version?: string
  /**
   * Edit-this-page link rendered under every doc page. Omit to hide.
   */
  readonly edit?: SiteEditConfig
  /**
   * Report-an-issue link rendered under every doc page. Omit to hide.
   */
  readonly report?: SiteReportConfig
  /**
   * Promo card rendered at the bottom of the docs sidebar. Omit to hide.
   */
  readonly sidebarPromo?: SiteSidebarPromoConfig
  /**
   * Topbar call-to-action button (also mirrored in the mobile nav).
   */
  readonly topbarCta?: SiteCtaConfig
  /**
   * Announcement banner rendered above the topbar.
   */
  readonly announcement?: AnnouncementConfig
  /**
   * Extended footer config — link columns and tagline.
   */
  readonly footer?: SiteFooterConfig
}

/**
 * zpress configuration.
 *
 * Schema: `zpressConfigSchema` in schema.ts validates this shape.
 * The information architecture tree IS the config — each node defines
 * what it is, where its content comes from, and where it sits in the sidebar.
 */
export interface ZpressConfig {
  readonly title?: string
  readonly description?: string
  readonly theme?: ThemeConfig
  /**
   * Custom theme definitions registered at config time.
   *
   * Each entry is a `ZpressThemeInput` (the same shape accepted by
   * `defineTheme`). Registering a theme here makes its `name` selectable
   * via `theme.name` and via the theme switcher. Built-in themes
   * (`base`, `midnight`, `arcade`) remain available regardless of this field.
   *
   * @example
   * ```ts
   * import { defineTheme } from 'zpress'
   *
   * export default defineConfig({
   *   themes: [
   *     defineTheme({ name: 'custom', tokens: myTokens }),
   *   ],
   * })
   * ```
   */
  readonly themes?: readonly ZpressThemeInput[]
  readonly icon?: IconId
  readonly tagline?: string
  readonly actions?: readonly HeroAction[]
  /**
   * Workspace apps — standalone applications and runnable services (APIs,
   * workers, web apps, and anything that deploys independently).
   * Single source of truth for app metadata used on the home page,
   * landing pages, and introduction page.
   */
  readonly apps?: readonly Workspace[]
  /**
   * Workspace packages — reusable modules shared across the codebase
   * (libraries, utilities, configs, SDKs, and internal tooling).
   * Single source of truth for package metadata used on the home page,
   * landing pages, and introduction page.
   */
  readonly packages?: readonly Workspace[]
  /**
   * Custom workspace groups — arbitrary named groups of workspace items.
   * Each group receives the same card/landing-page treatment as apps and packages.
   * Rendered after apps and packages, in array order.
   */
  readonly workspaces?: readonly WorkspaceCategory[]
  readonly features?: readonly Feature[]
  readonly sidebar?: SidebarConfig
  readonly sections: readonly Section[]
  readonly nav?: 'auto' | readonly NavItem[]
  readonly exclude?: readonly string[]
  readonly openapi?: OpenAPIConfig
  readonly home?: HomeConfig
  readonly socialLinks?: readonly SocialLink[]
  readonly footer?: FooterConfig
  /**
   * Site-level chrome configuration — version chip, edit/report links,
   * sidebar promo, topbar CTA, announcement, and extended footer.
   *
   * Every field is optional; pieces with no config render nothing.
   */
  readonly site?: SiteConfig
}
