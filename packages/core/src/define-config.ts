import { THEME_NAMES, COLOR_MODES } from '@zpress/theme'
import { match, P } from 'ts-pattern'

import { hasAnyGlobInclude, isSingleFileInclude } from './glob.ts'
import { collectAllWorkspaceItems } from './sync/collect-workspaces.ts'
import { configError } from './sync/errors.ts'
import type { ConfigError, ConfigResult } from './sync/errors.ts'
import type {
  ZpressConfig,
  Section,
  Feature,
  Workspace,
  WorkspaceCategory,
  IconConfig,
  ThemeConfig,
  ThemeColors,
  OpenAPIConfig,
} from './types.ts'

/**
 * Type-safe config helper for user config files.
 *
 * This is a passthrough that provides type safety and editor
 * autocompletion in `zpress.config.ts`. Validation is deferred to
 * `loadConfig` at CLI runtime, so errors surface with structured
 * feedback rather than a raw `process.exit`.
 *
 * @param config - Raw zpress config object
 * @returns The config (unchanged)
 */
export function defineConfig(config: ZpressConfig): ZpressConfig {
  return config
}

/**
 * Validate the entire config, returning the first error found.
 *
 * @param config - Raw zpress config object to validate
 * @returns A `ConfigResult` tuple — `[null, config]` on success or `[ConfigError, null]` on failure
 */
export function validateConfig(config: ZpressConfig): ConfigResult<ZpressConfig> {
  if (!config.sections || config.sections.length === 0) {
    return [configError('empty_sections', 'config.sections must have at least one section'), null]
  }

  const [appsErr] = validateWorkspaces(config.apps ?? [])
  if (appsErr) {
    return [appsErr, null]
  }

  const [pkgsErr] = validateWorkspaces(config.packages ?? [])
  if (pkgsErr) {
    return [pkgsErr, null]
  }

  const [groupErr] = validateWorkspaceCategories(config.workspaces ?? [])
  if (groupErr) {
    return [groupErr, null]
  }

  const allWorkspaceItems = collectAllWorkspaceItems(config)
  const [wsErr] = validateWorkspaces(allWorkspaceItems)
  if (wsErr) {
    return [wsErr, null]
  }

  const [openapiErr] = validateAllOpenAPI(config.openapi, allWorkspaceItems)
  if (openapiErr) {
    return [openapiErr, null]
  }

  const sectionErrors = config.sections.reduce<ConfigError | null>((acc, section) => {
    if (acc) {
      return acc
    }
    const [sectionErr] = validateSection(section)
    if (sectionErr) {
      return sectionErr
    }
    return null
  }, null)

  if (sectionErrors) {
    return [sectionErrors, null]
  }

  const [featErr] = validateFeatures(config.features)
  if (featErr) {
    return [featErr, null]
  }

  const userThemeNames = (config.themes ?? []).map((t) => t.name)
  const [themeErr] = validateTheme(config.theme, userThemeNames)
  if (themeErr) {
    return [themeErr, null]
  }

  return [null, config]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check if include contains a recursive glob pattern ('**').
 *
 * @private
 * @param include - Include value from section config
 * @returns True if include contains '**'
 */
function includeHasRecursive(include: Section['include']): boolean {
  if (include === null || include === undefined) {
    return false
  }
  if (typeof include === 'string') {
    return include.includes('**')
  }
  return include.some((p) => p.includes('**'))
}

/**
 * Validate workspaces.
 *
 * @private
 * @param items - Workspace items to validate
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateWorkspaces(items: readonly Workspace[]): ConfigResult<true> {
  const pathError = items.reduce<{ error: ConfigError | null; seen: ReadonlySet<string> }>(
    (acc, item) => {
      if (acc.error) {
        return acc
      }

      if (!item.title) {
        return {
          error: configError('missing_field', 'Workspace: "title" is required'),
          seen: acc.seen,
        }
      }

      if (!item.description) {
        return {
          error: configError(
            'missing_field',
            `Workspace "${item.title}": "description" is required`
          ),
          seen: acc.seen,
        }
      }

      if (!item.path) {
        return {
          error: configError('missing_field', `Workspace "${item.title}": "path" is required`),
          seen: acc.seen,
        }
      }

      if (acc.seen.has(item.path)) {
        return {
          error: configError(
            'duplicate_prefix',
            `Workspace "${item.title}": duplicate path "${item.path}"`
          ),
          seen: acc.seen,
        }
      }

      const [iconErr] = validateIconConfig(item.icon, `Workspace "${item.title}"`)
      if (iconErr) {
        return { error: iconErr, seen: acc.seen }
      }

      return { error: null, seen: new Set([...acc.seen, item.path]) }
    },
    { error: null, seen: new Set<string>() }
  )

  if (pathError.error) {
    return [pathError.error, null]
  }
  return [null, true]
}

/**
 * Validate workspace categories have required fields and non-empty items.
 *
 * @private
 * @param categories - Workspace categories to validate
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateWorkspaceCategories(categories: readonly WorkspaceCategory[]): ConfigResult<true> {
  const categoryError = categories.reduce<ConfigError | null>((acc, category) => {
    if (acc) {
      return acc
    }

    if (!category.title) {
      return configError('missing_field', 'WorkspaceCategory: "title" is required')
    }

    if (!category.icon) {
      return configError(
        'missing_field',
        `WorkspaceCategory "${category.title}": "icon" is required`
      )
    }

    if (!category.items || category.items.length === 0) {
      return configError(
        'missing_field',
        `WorkspaceCategory "${category.title}": "items" must be a non-empty array`
      )
    }

    return null
  }, null)

  if (categoryError) {
    return [categoryError, null]
  }
  return [null, true]
}

/**
 * Validate a single section node (recursive).
 *
 * @private
 * @param section - Section config node to validate
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateSection(section: Section): ConfigResult<true> {
  const titleStr = match(section.title)
    .with(P.string, (t) => t)
    .otherwise(() => 'Section')

  if (section.include && section.content) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": 'include' and 'content' are mutually exclusive`
      ),
      null,
    ]
  }

  if (section.path && !section.include && !section.content && !section.items) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": page with 'path' must have 'include', 'content', or 'items'`
      ),
      null,
    ]
  }

  if (isSingleFileInclude(section.include) && !section.items && !section.path) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": single-file 'include' requires 'path'`
      ),
      null,
    ]
  }

  if (hasAnyGlobInclude(section.include) && !section.path) {
    return [
      configError('invalid_section', `Section "${titleStr}": glob 'include' requires 'path'`),
      null,
    ]
  }

  if (section.recursive && !includeHasRecursive(section.include)) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": 'recursive' requires a recursive glob pattern (e.g. "**/*.md")`
      ),
      null,
    ]
  }

  if (section.recursive && !section.path) {
    return [
      configError('invalid_section', `Section "${titleStr}": 'recursive' requires 'path'`),
      null,
    ]
  }

  // Validate landing field only applies when items exist
  if (section.landing !== undefined && !section.items) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": 'landing' only applies to sections with 'items'`
      ),
      null,
    ]
  }

  // Validate landing requires path
  if (section.landing === true && !section.path) {
    return [
      configError('invalid_section', `Section "${titleStr}": 'landing' requires 'path' to be set`),
      null,
    ]
  }

  // Validate standalone requires path
  if (section.standalone && !section.path) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": 'standalone' requires 'path' to be set`
      ),
      null,
    ]
  }

  if (section.items) {
    const childErr = section.items.reduce<ConfigError | null>((acc, child) => {
      if (acc) {
        return acc
      }
      const [err] = validateSection(child)
      if (err) {
        return err
      }
      return null
    }, null)

    if (childErr) {
      return [childErr, null]
    }
  }

  return [null, true]
}

/**
 * Validate explicit features when provided.
 * Each feature must have `title` and `description`.
 *
 * @private
 * @param features - Optional features array from config
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateFeatures(features: ZpressConfig['features']): ConfigResult<true> {
  if (features === undefined) {
    return [null, true]
  }

  const featureError = features.reduce<ConfigError | null>((acc, feature) => {
    if (acc) {
      return acc
    }
    return validateFeature(feature)
  }, null)

  if (featureError) {
    return [featureError, null]
  }
  return [null, true]
}

/**
 * Validate a single feature has required fields and valid icon format.
 *
 * @private
 * @param feature - Feature object to validate
 * @returns `ConfigError` on failure or `null` on success
 */
function validateFeature(feature: Feature): ConfigError | null {
  if (!feature.title) {
    return configError('missing_field', 'Feature: "title" is required')
  }

  if (!feature.description) {
    return configError('missing_field', `Feature "${feature.title}": "description" is required`)
  }

  if (!feature.link) {
    return configError('missing_field', `Feature "${feature.title}": "link" is required`)
  }

  const [iconErr] = validateIconConfig(feature.icon, `Feature "${feature.title}"`)
  if (iconErr) {
    return iconErr
  }

  return null
}

/**
 * Validate an IconConfig value (string or object form).
 * String form must contain `:`. Object form must have `id` with `:`.
 *
 * @private
 * @param icon - Icon config value to validate
 * @param context - Label for error messages
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateIconConfig(icon: IconConfig | undefined, context: string): ConfigResult<true> {
  if (icon === undefined) {
    return [null, true]
  }

  if (typeof icon === 'string') {
    if (!icon.includes(':')) {
      return [
        configError(
          'invalid_icon',
          `${context}: icon must be an Iconify identifier (e.g. "devicon:hono")`
        ),
        null,
      ]
    }
    return [null, true]
  }

  // Object form: { id, color }
  if (!icon.id || !icon.id.includes(':')) {
    return [
      configError(
        'invalid_icon',
        `${context}: icon.id must be an Iconify identifier (e.g. "devicon:hono")`
      ),
      null,
    ]
  }

  return [null, true]
}

/**
 * Validate a single OpenAPI config.
 *
 * @private
 * @param openapi - OpenAPI config to validate
 * @param context - Label for error messages
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateOpenAPI(openapi: OpenAPIConfig, context: string): ConfigResult<true> {
  if (!openapi.spec || openapi.spec.length === 0) {
    return [configError('invalid_openapi', `${context}: "spec" must be a non-empty string`), null]
  }

  const validExtensions = ['.json', '.yaml', '.yml']
  const hasValidExtension = validExtensions.some((ext) => openapi.spec.endsWith(ext))
  if (!hasValidExtension) {
    return [
      configError(
        'invalid_openapi',
        `${context}: "spec" ("${openapi.spec}") must end with ${validExtensions.join(', ')}`
      ),
      null,
    ]
  }

  if (!openapi.path || !openapi.path.startsWith('/')) {
    return [configError('invalid_openapi', `${context}: "path" must start with "/"`), null]
  }

  return [null, true]
}

/**
 * Validate all OpenAPI configs from root and workspace items.
 * Ensures no duplicate paths and workspace-level paths are scoped correctly.
 *
 * @private
 * @param rootOpenapi - Root-level OpenAPI config (if any)
 * @param workspaces - All workspace items
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateAllOpenAPI(
  rootOpenapi: OpenAPIConfig | undefined,
  workspaces: readonly Workspace[]
): ConfigResult<true> {
  const rootConfigs: readonly { readonly config: OpenAPIConfig; readonly context: string }[] =
    match(rootOpenapi)
      .with(P.nonNullable, (o) => [{ config: o, context: 'openapi' }])
      .otherwise(() => [])

  const workspaceConfigs = workspaces
    .filter(
      (ws): ws is Workspace & { readonly openapi: OpenAPIConfig } =>
        ws.openapi !== null && ws.openapi !== undefined
    )
    .map((ws) => ({
      config: ws.openapi,
      context: `Workspace "${String(ws.title)}".openapi`,
      workspacePath: ws.path,
    }))

  const allConfigs = [...rootConfigs, ...workspaceConfigs]

  // Validate each config individually
  const individualError = allConfigs.reduce<ConfigError | null>((acc, entry) => {
    if (acc) {
      return acc
    }
    const [err] = validateOpenAPI(entry.config, entry.context)
    if (err) {
      return err
    }
    return null
  }, null)

  if (individualError) {
    return [individualError, null]
  }

  // Validate workspace-level paths are scoped under the workspace path
  const scopeError = workspaceConfigs.reduce<ConfigError | null>((acc, entry) => {
    if (acc) {
      return acc
    }
    const workspaceRoot = match(entry.workspacePath.endsWith('/'))
      .with(true, () => entry.workspacePath)
      .otherwise(() => `${entry.workspacePath}/`)
    if (!entry.config.path.startsWith(workspaceRoot)) {
      return configError(
        'invalid_openapi',
        `${entry.context}: "path" ("${entry.config.path}") must be nested under "${workspaceRoot}"`
      )
    }
    return null
  }, null)

  if (scopeError) {
    return [scopeError, null]
  }

  // Check for duplicate paths
  const duplicateError = allConfigs.reduce<{
    readonly error: ConfigError | null
    readonly seen: ReadonlySet<string>
  }>(
    (acc, entry) => {
      if (acc.error) {
        return acc
      }
      if (acc.seen.has(entry.config.path)) {
        return {
          error: configError(
            'invalid_openapi',
            `${entry.context}: duplicate OpenAPI path "${entry.config.path}"`
          ),
          seen: acc.seen,
        }
      }
      return { error: null, seen: new Set([...acc.seen, entry.config.path]) }
    },
    { error: null, seen: new Set<string>() }
  )

  if (duplicateError.error) {
    return [duplicateError.error, null]
  }

  return [null, true]
}

/**
 * Validate a single ThemeColors object.
 *
 * @private
 * @param colors - Theme colors object to validate
 * @param label - Label for error messages (e.g. 'colors' or 'darkColors')
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateThemeColors(colors: ThemeColors, label: string): ConfigResult<true> {
  const colorPattern = /^(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgba?\([^)]*\))$/
  const keys: readonly (keyof ThemeColors)[] = [
    'brand',
    'brandLight',
    'brandDark',
    'brandSoft',
    'bg',
    'bgAlt',
    'bgElv',
    'bgSoft',
    'text1',
    'text2',
    'text3',
    'divider',
    'border',
    'homeBg',
  ]

  const firstError = keys.reduce<ConfigError | null>((acc, key) => {
    if (acc) {
      return acc
    }
    const value = colors[key]
    if (value !== undefined && !colorPattern.test(value)) {
      return configError(
        'invalid_theme',
        `theme.${label}.${key}: "${value}" is not a valid color (use hex #xxx/#xxxxxx or rgba())`
      )
    }
    return null
  }, null)

  if (firstError) {
    return [firstError, null]
  }
  return [null, true]
}

/**
 * Validate theme configuration when provided.
 *
 * @private
 * @param theme - Optional theme config to validate
 * @returns A `ConfigResult` tuple with `true` on success or `ConfigError` on failure
 */
function validateTheme(
  theme: ThemeConfig | undefined,
  userThemeNames: readonly string[]
): ConfigResult<true> {
  if (theme === undefined) {
    return [null, true]
  }

  const allKnownNames: readonly string[] = [
    ...(THEME_NAMES as readonly string[]),
    ...userThemeNames,
  ]
  if (theme.name !== undefined && !allKnownNames.includes(theme.name)) {
    return [
      configError(
        'invalid_theme',
        `theme.name: "${theme.name}" is not a valid theme (use ${allKnownNames.map((n) => `"${n}"`).join(', ')})`
      ),
      null,
    ]
  }

  if (theme.variant !== undefined && !(COLOR_MODES as readonly string[]).includes(theme.variant)) {
    return [
      configError(
        'invalid_theme',
        `theme.variant: "${theme.variant}" is not valid (use ${COLOR_MODES.map((m) => `"${m}"`).join(', ')})`
      ),
      null,
    ]
  }

  if (theme.colors) {
    const [colorsErr] = validateThemeColors(theme.colors, 'colors')
    if (colorsErr) {
      return [colorsErr, null]
    }
  }

  if (theme.darkColors) {
    const [darkErr] = validateThemeColors(theme.darkColors, 'darkColors')
    if (darkErr) {
      return [darkErr, null]
    }
  }

  return [null, true]
}
