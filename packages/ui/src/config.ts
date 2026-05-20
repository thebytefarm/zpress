import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import type { UserConfig } from '@rspress/core'
import type {
  BuiltInThemeName,
  HomeConfig,
  Paths,
  ThemeColors,
  ThemeName,
  ZpressConfig,
} from '@zpress/config'
import {
  BUILT_IN_THEMES,
  defineTheme,
  isBuiltInTheme,
  resolveDefaultVariant,
  resolveThemeVariants,
  themeToCss,
} from '@zpress/theme'
import type { ThemeVariant, ZpressTheme } from '@zpress/theme'
import fileTree from 'rspress-plugin-file-tree'
import katex from 'rspress-plugin-katex'
import supersub from 'rspress-plugin-supersub'
import { match, P } from 'ts-pattern'

import { getThemeCss } from './css.ts'
import { readJs } from './head/read.ts'
import { zpressPlugin } from './plugin.ts'
import { remarkMathToDiv } from './plugins/katex/remark-math-to-div.ts'
import { mermaidPlugin } from './plugins/mermaid/plugin.ts'

interface CreateRspressConfigOptions {
  readonly config: ZpressConfig
  readonly paths: Paths
  readonly logLevel?: 'info' | 'warn' | 'error' | 'silent'
  readonly vscode?: boolean
  readonly themeOverride?: ThemeName
  readonly variantOverride?: ThemeVariant
}

interface HeadScriptOptions {
  readonly variant: ThemeVariant
  readonly themeName: string
  readonly vscode: boolean
  readonly registry: readonly ThemeRegistryEntry[]
}

/**
 * Serialized theme registry entry consumed by the theme switcher and
 * theme provider. Carries the minimum metadata needed to render and apply
 * a theme without re-importing `@zpress/theme` at runtime.
 */
interface ThemeRegistryEntry {
  readonly name: string
  readonly label: string
  readonly swatch: string
  readonly variants: readonly ThemeVariant[]
  readonly defaultVariant: ThemeVariant
}

const VSCODE_SET_JS = `document.documentElement.dataset.zpressEnv='vscode'`
const VSCODE_NAV_JS = readJs('js/vscode-nav.js')
const LOADER_DOTS_JS = readJs('js/loader-dots.js')

/**
 * Serialized registry of built-in themes — the static portion of the
 * `__ZPRESS_THEME_REGISTRY__` define. User-defined themes from
 * `config.themes` are appended per build inside `createRspressConfig`.
 */
const BUILT_IN_THEME_REGISTRY: readonly ThemeRegistryEntry[] =
  Object.values(BUILT_IN_THEMES).map(buildRegistryEntry)

/**
 * Translate zpress config + sync engine output into a complete
 * Rspress configuration object.
 *
 * @param options - Config, paths, and optional log level
 * @returns Complete Rspress UserConfig object
 */
export function createRspressConfig(options: CreateRspressConfigOptions): UserConfig {
  const { config, paths, logLevel, vscode } = options

  const workspaces = loadGenerated({
    contentDir: paths.contentDir,
    name: 'workspaces.json',
    fallback: [],
  })
  const standaloneScopePaths = loadGenerated<readonly string[]>({
    contentDir: paths.contentDir,
    name: 'scopes.json',
    fallback: [],
  })
  const gitBranch = detectGitBranch()

  const themeName = resolveThemeName(config, options.themeOverride)
  const userThemes = resolveUserThemes(config)
  const variant = resolveActiveVariant({
    config,
    themeName,
    override: options.variantOverride,
    userThemes,
  })
  const themeSwitcher = resolveThemeSwitcher(config)
  const themeColors = resolveThemeColors(config)
  const themeDarkColors = resolveThemeDarkColors(config)

  const userThemesCss = userThemes.map(themeToCss).join('')
  const themeCss = getThemeCss(themeName) + userThemesCss
  const themeRegistry: readonly ThemeRegistryEntry[] = [
    ...BUILT_IN_THEME_REGISTRY,
    ...userThemes.map(buildRegistryEntry),
  ]
  const isVscode = vscode === true
  const headScriptBody = buildHeadScriptBody({
    variant,
    themeName,
    vscode: isVscode,
    registry: themeRegistry,
  })

  // Force a single React instance across all compiled theme components.
  // Without this alias, Rspress's rspack may resolve react from the
  // @zpress/ui dist/theme directory (deep inside pnpm's .pnpm store),
  // producing a second copy that triggers "Invalid hook call" errors.
  // Resolve from this package's context (react is a peer dep of @zpress/ui).
  const selfRequire = createRequire(import.meta.url)
  const reactAlias = path.dirname(selfRequire.resolve('react/package.json'))
  const reactDomAlias = path.dirname(selfRequire.resolve('react-dom/package.json'))

  // Bundle the user's zpress.config.{ts,js,...} into the browser graph so
  // function-form fields (e.g. `logo: ({ theme }) => <ZpressLogo />`) can
  // run at render time. The slot component imports from this alias; the
  // shim falls back to an empty object so the import always resolves even
  // when the user has no config file or only data fields.
  const userConfigAlias = resolveUserConfigAlias(paths.repoRoot)
  const resolvedLogo = match(config.logo)
    .with(P.string, (s) => s)
    .otherwise(() => '')

  return {
    root: paths.contentDir,
    outDir: paths.distDir,

    route: { cleanUrls: true },

    llms: true,

    title: config.title ?? 'zpress',
    description: config.description ?? 'Documentation',

    icon: config.icon ?? '/icon.svg',
    // String logos pass through to Rspress's stock `<img>` rendering.
    // Function logos and the default-branded fallback render via the
    // <NavLogo /> globalUIComponent which portals into `.rp-nav__title__link`.
    logo: resolvedLogo,
    logoText: '',

    themeDir: path.resolve(import.meta.dirname, 'theme'),

    plugins: [
      zpressPlugin(),
      mermaidPlugin(),
      fileTree({ initialExpandDepth: 1 }),
      supersub(),
      katex(),
    ],

    markdown: {
      remarkPlugins: [remarkMathToDiv],
    },

    builderConfig: {
      ...(() => {
        if (logLevel) {
          return { logLevel }
        }
        return {}
      })(),
      html: {
        tags: [
          {
            tag: 'style',
            children: themeCss,
            attrs: { 'data-zpress-theme-css': true },
            append: false,
            head: true,
          },
          {
            tag: 'script',
            children: `(function(){${headScriptBody}})()`,
            append: false,
            head: true,
          },
        ],
      },
      resolve: {
        alias: {
          // Deduplicate React — pnpm isolation can cause rspack to resolve
          // different physical copies from theme components vs Rspress internals.
          react: reactAlias,
          'react-dom': reactDomAlias,
          // Allow generated MDX files in .zpress/content/ to import
          // zpress React components used in landing pages.
          '@zpress/ui/theme': path.resolve(import.meta.dirname, 'theme', 'index.tsx'),
          // Bridge the user's zpress.config.* into the browser bundle so
          // function-form fields (e.g. `logo`) can run at render time.
          // Falls back to a stub re-exporting `{}` when no config file exists.
          '@zpress/internal/user-config': userConfigAlias,
        },
      },
      source: {
        define: {
          __ZPRESS_GIT_BRANCH__: JSON.stringify(gitBranch),
          __ZPRESS_THEME_NAME__: JSON.stringify(themeName),
          __ZPRESS_DEFAULT_VARIANT__: JSON.stringify(variant),
          __ZPRESS_THEME_COLORS__: JSON.stringify(JSON.stringify(themeColors)),
          __ZPRESS_THEME_DARK_COLORS__: JSON.stringify(JSON.stringify(themeDarkColors)),
          __ZPRESS_THEME_SWITCHER__: JSON.stringify(themeSwitcher),
          __ZPRESS_THEME_REGISTRY__: JSON.stringify(JSON.stringify(themeRegistry)),
          __ZPRESS_VSCODE__: JSON.stringify(isVscode),
        },
      },
      output: {
        distPath: {
          root: paths.distDir,
        },
      },
    },

    themeConfig: {
      // Rspress's sun/moon toggle is shown when the active theme exposes
      // more than one variant — when there's only one, the toggle is
      // visually irrelevant. CSS in
      // `packages/ui/src/theme/styles/overrides/rspress.css` hides it on
      // single-variant themes via `[data-zp-variants]`.
      darkMode: true,
      search: true,
      // Custom zpress data injected alongside standard Rspress themeConfig.
      // Accessed at runtime via useSite().site.themeConfig cast to unknown.
      ...({ workspaces, standaloneScopePaths } as Record<string, unknown>),
      ...({
        socialLinks: config.socialLinks,
        sidebarAbove: resolveSidebarLinks({ config, position: 'above' }),
        sidebarBelow: resolveSidebarLinks({ config, position: 'below' }),
        home: resolveHomeConfig(config),
        zpressFooter: config.footer,
        site: config.site,
      } as Record<string, unknown>),
    },
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Load a generated JSON file from the sync engine output, falling back
 * to a default value if the file does not exist yet.
 *
 * @private
 * @param params - Content directory, file name, and fallback value
 * @returns Parsed JSON content or the fallback value
 */
function loadGenerated<T>(params: {
  readonly contentDir: string
  readonly name: string
  readonly fallback: T
}): T {
  const p = path.resolve(params.contentDir, '.generated', params.name)
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: derived from known output directory
  if (!existsSync(p)) {
    process.stderr.write(
      `[zpress] Generated file not found: ${params.name} — run "zpress sync" first\n`
    )
    return params.fallback
  }
  try {
    // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: derived from known output directory
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    process.stderr.write(`[zpress] Failed to parse ${params.name} — returning fallback\n`)
    return params.fallback
  }
}

/**
 * Detect current git branch at build time — falls back to empty string.
 *
 * @private
 * @returns Current git branch name or empty string
 */
function detectGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: 'pipe' }).trim()
  } catch {
    return ''
  }
}

/**
 * Resolve the theme name from config, defaulting to `'default'`.
 *
 * Validates the resolved name against the merged registry (built-in themes
 * plus any user themes declared in `config.themes`). An unknown name —
 * caused by a typo or by removing a custom theme without updating
 * `theme.name` — writes a warning to stderr and falls back to `'default'`
 * so the build still produces working CSS.
 *
 * @private
 * @param config - Zpress config object
 * @param override - Optional CLI override (e.g. `--theme=midnight`)
 * @returns Resolved theme name
 */
function resolveThemeName(config: ZpressConfig, override?: ThemeName): ThemeName {
  const registeredNames = collectRegisteredThemeNames(config)
  const requested = resolveRequestedThemeName(config, override)
  if (registeredNames.has(requested)) {
    return requested
  }
  process.stderr.write(
    `[zpress] Unknown theme '${requested}' — not a built-in and not declared in config.themes. Falling back to 'default'.\n`
  )
  return 'default'
}

/**
 * Pick the theme name the consumer asked for, in precedence order:
 * CLI override > `config.theme.name` > `'default'`.
 *
 * @private
 * @param config - Zpress config object
 * @param override - Optional CLI override
 * @returns Requested theme name (not yet validated against the registry)
 */
function resolveRequestedThemeName(config: ZpressConfig, override?: ThemeName): ThemeName {
  if (override) {
    return override
  }
  if (config.theme && config.theme.name) {
    return config.theme.name
  }
  return 'default'
}

/**
 * Build the set of theme names known to this build — built-in themes plus
 * any user themes declared in `config.themes` (each validated through
 * `defineTheme` to surface bad input before this point).
 *
 * @private
 * @param config - Zpress config object
 * @returns Set of registered theme names
 */
function collectRegisteredThemeNames(config: ZpressConfig): ReadonlySet<string> {
  const builtIn = Object.keys(BUILT_IN_THEMES)
  const user = (config.themes ?? []).map((t) => t.name)
  return new Set<string>([...builtIn, ...user])
}

/**
 * Resolve the initial variant to render for the active theme.
 *
 * Precedence: CLI override > `config.theme.variant` > theme's own
 * `defaultVariant`. When the requested variant is not declared by the
 * active theme, falls back to the theme's `defaultVariant` (and writes
 * a warning to stderr).
 *
 * @private
 * @param params - Config, resolved theme name, optional CLI override, resolved user themes
 * @returns Variant to apply on first render
 */
function resolveActiveVariant(params: {
  readonly config: ZpressConfig
  readonly themeName: ThemeName
  readonly override?: ThemeVariant
  readonly userThemes: readonly ZpressTheme[]
}): ThemeVariant {
  const supported = resolveSupportedVariants(params.themeName, params.userThemes)
  const themeBlock = params.config.theme
  const fromConfig = match(themeBlock)
    .with(undefined, () => {})
    .otherwise((block) => block.variant)
  const requested = params.override ?? fromConfig
  if (requested !== undefined && supported.includes(requested)) {
    return requested
  }
  if (requested !== undefined) {
    process.stderr.write(
      `[zpress] Theme '${params.themeName}' does not declare variant '${requested}'. Falling back to its default variant.\n`
    )
  }
  if (isBuiltInTheme(params.themeName)) {
    return resolveDefaultVariant(params.themeName as BuiltInThemeName)
  }
  const userTheme = params.userThemes.find((t) => t.name === params.themeName)
  if (userTheme) {
    return userTheme.defaultVariant
  }
  return 'dark'
}

/**
 * Variants declared by the active theme (built-in or user). Used to
 * validate `theme.variant` overrides and to fall back to a sensible
 * default when the request is unsupported.
 *
 * @private
 * @param themeName - Resolved theme name
 * @param userThemes - Validated user themes from `config.themes`
 * @returns Variants the theme supports
 */
function resolveSupportedVariants(
  themeName: ThemeName,
  userThemes: readonly ZpressTheme[]
): readonly ThemeVariant[] {
  if (isBuiltInTheme(themeName)) {
    return resolveThemeVariants(themeName as BuiltInThemeName)
  }
  const userTheme = userThemes.find((t) => t.name === themeName)
  if (userTheme) {
    return (Object.keys(userTheme.variants) as ThemeVariant[]).filter(
      (v) => userTheme.variants[v] !== undefined
    )
  }
  return ['dark']
}

/**
 * Resolve whether the theme switcher is enabled.
 *
 * @private
 * @param config - Zpress config object
 * @returns True if the theme switcher is enabled
 */
function resolveThemeSwitcher(config: ZpressConfig): boolean {
  if (config.theme && config.theme.switcher) {
    return config.theme.switcher
  }
  return false
}

/**
 * Resolve theme color overrides applied to the `light` variant,
 * defaulting to empty object.
 *
 * @private
 * @param config - Zpress config object
 * @returns Theme color overrides
 */
function resolveThemeColors(config: ZpressConfig): ThemeColors {
  if (config.theme && config.theme.colors) {
    return config.theme.colors
  }
  return {}
}

/**
 * Resolve theme color overrides applied to the `dark` variant,
 * defaulting to empty object.
 *
 * @private
 * @param config - Zpress config object
 * @returns Dark variant color overrides
 */
function resolveThemeDarkColors(config: ZpressConfig): ThemeColors {
  if (config.theme && config.theme.darkColors) {
    return config.theme.darkColors
  }
  return {}
}

/**
 * Validate and freeze every `ZpressThemeInput` declared in `config.themes`,
 * producing fully-typed `ZpressTheme` instances ready for CSS emission and
 * registry serialisation.
 *
 * Each input flows through `defineTheme`, which runs each variant's token
 * tree through `tokensSchema` — surfaced validation errors are intentional
 * config-time failures (same contract as `defineTheme` in `@zpress/theme`).
 *
 * @private
 * @param config - Zpress config object
 * @returns Resolved user theme definitions, in declaration order
 */
function resolveUserThemes(config: ZpressConfig): readonly ZpressTheme[] {
  if (!config.themes) {
    return []
  }
  return config.themes.map(defineTheme)
}

/**
 * Resolve sidebar link items for a given position, defaulting to empty array.
 *
 * @private
 * @param params - Config and sidebar position
 * @returns Array of sidebar link items
 */
function resolveSidebarLinks(params: {
  readonly config: ZpressConfig
  readonly position: 'above' | 'below'
}): readonly {
  text: string
  link: string
  icon?: string | { id: string; color: string }
  style?: 'brand' | 'alt' | 'ghost'
  shape?: 'square' | 'rounded' | 'circle'
}[] {
  const items = params.config.sidebar && params.config.sidebar[params.position]
  if (items) {
    return items
  }
  return []
}

/**
 * Resolve home page layout config with defaults.
 * Workspaces default to 2 columns.
 *
 * @private
 * @param config - Zpress config object
 * @returns Resolved home config
 */
function resolveHomeConfig(config: ZpressConfig): HomeConfig {
  if (config.home) {
    return {
      features: config.home.features,
      workspaces: {
        columns: 2,
        ...config.home.workspaces,
      },
    }
  }
  return { workspaces: { columns: 2 } }
}

/**
 * Build the raw JS body for the inline head script (no wrapping tags).
 *
 * Resolves the active theme and variant **once** in a single IIFE so
 * `data-zp-theme`, `data-zp-variant`, `.rp-dark`, and Rspress's
 * `localStorage['rspress-theme-appearance']` are all consistent before
 * React hydrates. The script intersects persisted values from
 * `localStorage` against the embedded registry — stale or unsupported
 * values fall through to the build-time defaults rather than poisoning
 * first paint.
 *
 * Keep the persistence keys and resolution ladder in sync with:
 *   - `theme/components/theme-provider.tsx` → `resolveActiveVariant`
 *   - `theme/components/nav/theme-switcher.tsx` → `applyTheme`
 * Any divergence between the three causes a flash between first paint,
 * React hydration, and user-triggered theme switches.
 *
 * @private
 * @param options - Variant, theme name, vscode flag, and registry
 * @returns Concatenated inline JS string
 */
function buildHeadScriptBody(options: HeadScriptOptions): string {
  // Minimal registry for the head script — only `name → variants[]` plus
  // each theme's default variant. Anything else is dead weight in the
  // critical-path script.
  const minimalRegistry = options.registry.map((entry) => ({
    name: entry.name,
    variants: [...entry.variants],
    defaultVariant: entry.defaultVariant,
  }))

  const resolveJs = `(function(){
    var R = ${JSON.stringify(minimalRegistry)};
    var buildTheme = ${JSON.stringify(options.themeName)};
    var buildVariant = ${JSON.stringify(options.variant)};
    function readLS(k){try{return localStorage.getItem(k)}catch(_){return null}}
    var name = (function(){
      var s = readLS('zpress-theme');
      for (var i = 0; i < R.length; i++) { if (R[i].name === s) { return s; } }
      return buildTheme;
    })();
    var entry = R.find(function(e){return e.name===name});
    var supported = entry ? entry.variants : ['dark'];
    var themeDefault = entry ? entry.defaultVariant : buildVariant;
    var variant = (function(){
      var s = readLS('zpress-variant');
      if ((s === 'dark' || s === 'light') && supported.indexOf(s) !== -1) { return s; }
      if (supported.indexOf(themeDefault) !== -1) { return themeDefault; }
      if (supported.indexOf(buildVariant) !== -1) { return buildVariant; }
      return supported[0] || 'dark';
    })();
    var d = document.documentElement;
    d.dataset.zpTheme = name;
    d.dataset.zpVariant = variant;
    d.dataset.zpVariants = supported.join(' ');
    if (variant === 'dark') {
      d.classList.add('rp-dark', 'dark');
      d.dataset.dark = 'true';
    } else {
      d.classList.remove('rp-dark', 'dark');
      d.dataset.dark = 'false';
    }
    try { localStorage.setItem('rspress-theme-appearance', variant); } catch (_) {}
  })()`

  const vscodeJs: string = (() => {
    if (options.vscode) {
      return [VSCODE_SET_JS, VSCODE_NAV_JS].join(';')
    }
    return ''
  })()
  return [resolveJs, vscodeJs, LOADER_DOTS_JS].filter(Boolean).join(';')
}

/**
 * Map a `ZpressTheme` to its serialized registry entry. The swatch is the
 * default variant's `colors.brand.primary` — the single hex value the
 * theme switcher paints into each option's swatch dot.
 *
 * @private
 * @param theme - Built-in or user theme definition
 * @returns Registry entry consumed by the theme switcher and provider
 */
function buildRegistryEntry(theme: ZpressTheme): ThemeRegistryEntry {
  const defaultTokens = theme.variants[theme.defaultVariant]
  const swatch = match(defaultTokens)
    .with(undefined, () => '')
    .otherwise((tokens) => tokens.colors.brand.primary)
  const variants = (Object.keys(theme.variants) as ThemeVariant[]).filter(
    (v) => theme.variants[v] !== undefined
  )
  return {
    name: theme.name,
    label: toLabel(theme.name),
    swatch,
    variants,
    defaultVariant: theme.defaultVariant,
  }
}

/**
 * Capitalize the first character of a theme name for display in the switcher.
 * Built-in theme names are single lowercase tokens (`default`, `midnight`,
 * `arcade`) so a simple capitalization is sufficient — no spaces or casing
 * tricks needed.
 *
 * @private
 * @param name - Theme identifier
 * @returns Display label
 */
function toLabel(name: string): string {
  if (name.length === 0) {
    return name
  }
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Extensions in priority order — first match wins. Mirrors `c12`'s
 * default zpress.config resolution so the alias points at the same file
 * c12 loaded server-side.
 */
const USER_CONFIG_EXTENSIONS: readonly string[] = Object.freeze([
  '.ts',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.cjs',
])

/**
 * Path to the empty stub re-exported when the user has no zpress.config
 * file at the standard location (or only has a non-bundleable variant
 * like `.json` / `.yaml`). Keeps the `@zpress/internal/user-config` alias
 * resolvable so the slot component's import never breaks the build.
 */
const USER_CONFIG_STUB_PATH = path.resolve(
  import.meta.dirname,
  'theme',
  'lib',
  'user-config-stub.ts'
)

/**
 * Resolve the absolute path used by the `@zpress/internal/user-config`
 * webpack alias.
 *
 * Looks for a bundleable user config (`zpress.config.{ts,mts,cts,js,mjs,cjs}`)
 * in `repoRoot`; falls back to a stub that re-exports `{}` so the slot
 * component's import always resolves.
 *
 * JSON / YAML configs are intentionally not aliased — they can't carry
 * function values (which is the whole point of the bridge), and Rspress's
 * `logo` string field already handles their static `logo` paths.
 *
 * @private
 * @param repoRoot - Project root directory (`paths.repoRoot`)
 * @returns Absolute path to the user's config file or the empty stub
 */
function resolveUserConfigAlias(repoRoot: string): string {
  const candidates = USER_CONFIG_EXTENSIONS.map((ext) =>
    path.resolve(repoRoot, `zpress.config${ext}`)
  )
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- candidates derived from trusted repoRoot + known extension list
  const found = candidates.find((p) => existsSync(p))
  if (found !== undefined) {
    return found
  }
  return USER_CONFIG_STUB_PATH
}
