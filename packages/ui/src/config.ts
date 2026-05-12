import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import type { UserConfig } from '@rspress/core'
import type {
  BuiltInThemeName,
  HomeConfig,
  ThemeColors,
  ThemeName,
  ZpressConfig,
} from '@zpress/config'
import type { Paths } from '@zpress/core'
import {
  BUILT_IN_THEMES,
  defineTheme,
  isBuiltInTheme,
  resolveDefaultColorMode,
  resolveThemeModes,
  themeToCss,
} from '@zpress/theme'
import type { ZpressTheme } from '@zpress/theme'
import fileTree from 'rspress-plugin-file-tree'
import katex from 'rspress-plugin-katex'
import supersub from 'rspress-plugin-supersub'

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
  readonly colorModeOverride?: string
}

interface HeadScriptOptions {
  readonly colorMode: string
  readonly themeName: string
  readonly vscode: boolean
}

/**
 * Serialized theme registry entry consumed by the theme switcher.
 * Carries the minimum metadata needed to render and apply a theme
 * without re-importing `@zpress/theme` at runtime.
 */
interface ThemeRegistryEntry {
  readonly name: string
  readonly label: string
  readonly swatch: string
  readonly modes: readonly ('dark' | 'light')[]
  readonly defaultColorMode: 'dark' | 'light' | 'toggle'
}

const COLOR_MODE_DARK_JS = readJs('js/color-mode-dark.js')
const COLOR_MODE_LIGHT_JS = readJs('js/color-mode-light.js')
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
  const colorMode = resolveColorMode({ config, themeName, override: options.colorModeOverride })
  const themeSwitcher = resolveThemeSwitcher(config)
  const themeColors = resolveThemeColors(config)
  const themeDarkColors = resolveThemeDarkColors(config)

  const userThemes = resolveUserThemes(config)
  const userThemesCss = userThemes.map(themeToCss).join('')
  const themeCss = getThemeCss(themeName) + userThemesCss
  const themeRegistry: readonly ThemeRegistryEntry[] = [
    ...BUILT_IN_THEME_REGISTRY,
    ...userThemes.map(buildRegistryEntry),
  ]
  const isVscode = vscode === true
  const headScriptBody = buildHeadScriptBody({ colorMode, themeName, vscode: isVscode })

  // Force a single React instance across all compiled theme components.
  // Without this alias, Rspress's rspack may resolve react from the
  // @zpress/ui dist/theme directory (deep inside pnpm's .pnpm store),
  // producing a second copy that triggers "Invalid hook call" errors.
  // Resolve from this package's context (react is a peer dep of @zpress/ui).
  const selfRequire = createRequire(import.meta.url)
  const reactAlias = path.dirname(selfRequire.resolve('react/package.json'))
  const reactDomAlias = path.dirname(selfRequire.resolve('react-dom/package.json'))

  return {
    root: paths.contentDir,
    outDir: paths.distDir,

    route: { cleanUrls: true },

    llms: true,

    title: config.title ?? 'zpress',
    description: config.description ?? 'Documentation',

    icon: config.icon ?? '/icon.svg',
    logo: '/logo.svg',
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
        },
      },
      source: {
        define: {
          __ZPRESS_GIT_BRANCH__: JSON.stringify(gitBranch),
          __ZPRESS_THEME_NAME__: JSON.stringify(themeName),
          __ZPRESS_COLOR_MODE__: JSON.stringify(colorMode),
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
      darkMode: colorMode === 'toggle',
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
        announcement: (config as unknown as { announcement?: unknown }).announcement,
        zpressVersion: config.title,
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
 * Resolve the theme name from config, defaulting to 'base'.
 *
 * @private
 * @param config - Zpress config object
 * @returns Resolved theme name
 */
function resolveThemeName(config: ZpressConfig, override?: ThemeName): ThemeName {
  if (override) {
    return override
  }
  if (config.theme && config.theme.name) {
    return config.theme.name
  }
  return 'base'
}

/**
 * Resolve the color mode from config, defaulting to the theme's natural mode.
 * For custom themes, defaults to 'toggle'.
 *
 * @private
 * @param params - Config and theme name
 * @returns Color mode string ('dark', 'light', or 'toggle')
 */
function resolveColorMode(params: {
  readonly config: ZpressConfig
  readonly themeName: ThemeName
  readonly override?: string
}): string {
  const requested =
    params.override ?? (params.config.theme && params.config.theme.colorMode) ?? null

  if (isBuiltInTheme(params.themeName)) {
    const supported = resolveThemeModes(params.themeName as BuiltInThemeName)
    if (requested && isColorModeSupported(requested, supported)) {
      return requested
    }
    return resolveDefaultColorMode(params.themeName as BuiltInThemeName)
  }

  if (requested) {
    return requested
  }
  return 'toggle'
}

/**
 * Check if a requested color mode is compatible with the theme's supported modes.
 * `toggle` is only valid when both `dark` and `light` are supported.
 *
 * @private
 * @param mode - Requested color mode
 * @param supported - Modes the theme supports
 * @returns True if the mode is valid for the theme
 */
function isColorModeSupported(mode: string, supported: readonly ('dark' | 'light')[]): boolean {
  if (mode === 'toggle') {
    return supported.includes('dark') && supported.includes('light')
  }
  return supported.includes(mode as 'dark' | 'light')
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
 * Resolve theme color overrides, defaulting to empty object.
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
 * Resolve dark mode color overrides, defaulting to empty object.
 *
 * @private
 * @param config - Zpress config object
 * @returns Dark mode color overrides
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
 * Each input flows through `defineTheme`, which runs the token tree through
 * `tokensSchema` — surfaced validation errors are intentional config-time
 * failures (same contract as `defineTheme` documented in `@zpress/theme`).
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
 * Generate the color mode fragment of the inline head script.
 * Reads from pre-minified JS asset files.
 *
 * @private
 * @param colorMode - Color mode string ('dark', 'light', or 'toggle')
 * @returns Inline JS string for forcing color mode
 */
function buildColorModeJs(colorMode: string): string {
  if (colorMode === 'dark') {
    return COLOR_MODE_DARK_JS
  }
  if (colorMode === 'light') {
    return COLOR_MODE_LIGHT_JS
  }
  // 'toggle' mode — no forced color mode; Rspress controls the toggle natively
  return ''
}

/**
 * Build the raw JS body for the inline head script (no wrapping tags).
 *
 * Handles concerns synchronously, before React hydration:
 * 1. Force color mode — sets localStorage and toggles rp-dark class
 * 2. Set data-zp-theme — enables theme-scoped CSS immediately
 * 3. (vscode only) Set data-zpress-env="vscode" so static vscode.css applies
 *
 * @private
 * @param options - Color mode, theme name, and vscode flag
 * @returns Concatenated inline JS string
 */
function buildHeadScriptBody(options: HeadScriptOptions): string {
  const colorModeJs = buildColorModeJs(options.colorMode)
  const themeAttrJs = `document.documentElement.dataset.zpTheme=function(){try{var t=localStorage.getItem('zpress-theme');if(t)return t}catch(_){}return ${JSON.stringify(options.themeName)}}();`
  const vscodeJs: string = (() => {
    if (options.vscode) {
      return [VSCODE_SET_JS, VSCODE_NAV_JS].join(';')
    }
    return ''
  })()
  return [colorModeJs, themeAttrJs, vscodeJs, LOADER_DOTS_JS].filter(Boolean).join(';')
}

/**
 * Map a `ZpressTheme` to its serialized registry entry. The swatch is the
 * theme's `colors.brand.primary` — the single hex value the theme switcher
 * paints into each option's swatch dot.
 *
 * @private
 * @param theme - Built-in theme definition
 * @returns Registry entry consumed by the theme switcher
 */
function buildRegistryEntry(theme: ZpressTheme): ThemeRegistryEntry {
  return {
    name: theme.name,
    label: toLabel(theme.name),
    swatch: theme.tokens.colors.brand.primary,
    modes: theme.modes,
    defaultColorMode: theme.defaultMode,
  }
}

/**
 * Capitalize the first character of a theme name for display in the switcher.
 * Built-in theme names are single lowercase tokens (`base`, `midnight`,
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
