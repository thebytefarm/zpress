import { THEME_NAMES, THEME_VARIANTS } from '@zpress/theme'
import { match, P } from 'massaman/match'

import { configError, configErrorFromZod } from './errors.ts'
import type { ConfigError, ConfigResult } from './errors.ts'
import { hasAnyGlobInclude, isSingleFileInclude } from './glob.ts'
import { zpressConfigSchema } from './schema.ts'
import type {
  Feature,
  IconConfig,
  OpenAPIConfig,
  Section,
  ThemeColors,
  ThemeConfig,
  Workspace,
  WorkspaceGroup,
  ZpressConfig,
} from './types.ts'
import { collectAllWorkspaceItems } from './workspace.ts'

/**
 * Validate a zpress config — Zod schema parse followed by semantic checks.
 *
 * 1. Schema parse via Zod (shape, types, required fields).
 * 2. Cross-field semantic validation (workspace path uniqueness, OpenAPI
 *    nesting, include/path coupling, landing/standalone requirements, icon
 *    identifier format, theme name validity).
 *
 * @param config - Raw config object to validate (typically loaded from `zpress.config.ts`)
 * @returns `ConfigResult` tuple — `[null, config]` on success or `[ConfigError, null]` on failure
 */
export function validateConfig(config: unknown): ConfigResult<ZpressConfig> {
  const parsed = zpressConfigSchema.safeParse(config)
  if (!parsed.success) {
    return [configErrorFromZod(parsed.error), null]
  }

  const validated = parsed.data as ZpressConfig
  const [semanticErr] = validateSemantics(validated)
  if (semanticErr) {
    return [semanticErr, null]
  }

  return [null, validated]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Run all semantic checks across the parsed config.
 *
 * @private
 * @param config - Schema-validated config
 * @returns First semantic error encountered, or success
 */
function validateSemantics(config: ZpressConfig): ConfigResult<true> {
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

  const [groupErr] = validateWorkspaceGroups(config.workspaces ?? [])
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

  return [null, true]
}

/**
 * Check if include contains a recursive glob pattern ('**').
 *
 * @private
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
 * Validate workspaces have required fields and no duplicate paths.
 *
 * @private
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
 * Validate workspace groups have required fields and non-empty items.
 *
 * @private
 */
function validateWorkspaceGroups(groups: readonly WorkspaceGroup[]): ConfigResult<true> {
  const categoryError = groups.reduce<ConfigError | null>((acc, group) => {
    if (acc) {
      return acc
    }

    if (!group.title) {
      return configError('missing_field', 'WorkspaceGroup: "title" is required')
    }

    if (!group.icon) {
      return configError('missing_field', `WorkspaceGroup "${group.title}": "icon" is required`)
    }

    if (!group.items || group.items.length === 0) {
      return configError(
        'missing_field',
        `WorkspaceGroup "${group.title}": "items" must be a non-empty array`
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

  if (section.landing !== undefined && !section.items) {
    return [
      configError(
        'invalid_section',
        `Section "${titleStr}": 'landing' only applies to sections with 'items'`
      ),
      null,
    ]
  }

  if (section.landing === true && !section.path) {
    return [
      configError('invalid_section', `Section "${titleStr}": 'landing' requires 'path' to be set`),
      null,
    ]
  }

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
 *
 * @private
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
 */
function validateFeature(feature: Feature): ConfigError | null {
  if (!feature.title) {
    return configError('missing_field', 'Feature: "title" is required')
  }

  if (!feature.description) {
    return configError('missing_field', `Feature "${feature.title}": "description" is required`)
  }

  const [iconErr] = validateIconConfig(feature.icon, `Feature "${feature.title}"`)
  if (iconErr) {
    return iconErr
  }

  return null
}

/**
 * Validate an IconConfig value (string or object form).
 *
 * @private
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
 *
 * @private
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

  if (
    theme.variant !== undefined &&
    !(THEME_VARIANTS as readonly string[]).includes(theme.variant)
  ) {
    return [
      configError(
        'invalid_theme',
        `theme.variant: "${theme.variant}" is not valid (use ${THEME_VARIANTS.map((m) => `"${m}"`).join(', ')})`
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
