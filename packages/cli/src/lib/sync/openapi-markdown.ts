/**
 * OpenAPI markdown renderer — generates copyable markdown from specs via Liquid templates.
 *
 * Loads `.liquid` templates from the package `templates/` directory and
 * renders them with flattened spec data to produce clean, structured
 * markdown strings for the "Copy Markdown" button.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Liquid } from 'liquidjs'
import { match, P } from 'ts-pattern'

import {
  extractBodyExample,
  groupParametersByIn,
  HTTP_METHODS,
  isBodyMethod,
  resolveBaseUrl,
  resolveOperation,
  resolveSecurities,
} from './openapi-spec.ts'

/**
 * Input for rendering an operation's markdown.
 */
interface OperationInput {
  readonly spec: Record<string, unknown>
  readonly method: string
  readonly path: string
  readonly operationId: string
}

/**
 * Input for rendering an overview page's markdown.
 */
interface OverviewInput {
  readonly spec: Record<string, unknown>
}

const engine = new Liquid()

const operationTemplate = loadTemplate('openapi-operation.liquid')
const overviewTemplate = loadTemplate('openapi-overview.liquid')

/**
 * Render markdown for an OpenAPI operation page.
 *
 * Resolves the operation from the spec, flattens all fields into
 * template-friendly shapes, and renders the Liquid template.
 *
 * @param input - Operation data with parsed spec
 * @returns Rendered markdown string
 */
export function renderOperationMarkdown(input: OperationInput): string {
  const operation = resolveOperation({ spec: input.spec, path: input.path, method: input.method })

  if (operation === null) {
    return `# ${input.method.toUpperCase()} \`${input.path}\`\n\nOperation not found.`
  }

  const summary = operation['summary'] as string | undefined
  const description = operation['description'] as string | undefined
  const parameters = (operation['parameters'] ?? []) as readonly Record<string, unknown>[]
  const requestBody = operation['requestBody'] as Record<string, unknown> | undefined
  const responses = (operation['responses'] ?? {}) as Record<string, unknown>
  const deprecated = operation['deprecated'] === true
  const securities = resolveSecurities({ operation, spec: input.spec })
  const baseUrl = resolveBaseUrl(input.spec)

  const data = {
    method: input.method.toUpperCase(),
    path: input.path,
    operationId: input.operationId,
    deprecated,
    summary,
    description,
    hasParameters: parameters.length > 0,
    parameterGroups: flattenParameterGroups(parameters),
    hasRequestBody: requestBody !== undefined,
    requestBody: flattenRequestBody(requestBody),
    hasResponses: Object.keys(responses).length > 0,
    responses: flattenResponses(responses),
    hasSecurity: securities.length > 0,
    securities: flattenSecurities(securities),
    curlExample: buildCurl(input.method, input.path, baseUrl, requestBody),
  }

  return engine.parseAndRenderSync(operationTemplate, data)
}

/**
 * Render markdown for an OpenAPI overview page.
 *
 * Extracts info, servers, auth schemes, and tag groups from the spec
 * and renders the Liquid template.
 *
 * @param input - Parsed spec object
 * @returns Rendered markdown string
 */
export function renderOverviewMarkdown(input: OverviewInput): string {
  const info = (input.spec['info'] ?? {}) as Record<string, unknown>
  const title = String(info['title'] ?? 'API Reference')
  const version = String(info['version'] ?? '')
  const description = info['description'] as string | undefined
  const servers = (input.spec['servers'] ?? []) as readonly Record<string, unknown>[]
  const components = (input.spec['components'] ?? {}) as Record<string, unknown>
  const securitySchemes = (components['securitySchemes'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >

  const authEntries = Object.entries(securitySchemes)
  const tagGroups = collectTagGroups(input.spec)

  const data = {
    title,
    version: match(version.length > 0)
      .with(true, () => version)
      .otherwise(() => null),
    description,
    hasServers: servers.length > 0,
    servers: servers.map((s) => ({
      url: String(s['url'] ?? ''),
      description: s['description'] as string | undefined,
    })),
    hasAuthSchemes: authEntries.length > 0,
    authSchemes: authEntries.map(([name, scheme]) => ({
      name,
      type: String(scheme['type'] ?? ''),
    })),
    hasTagGroups: tagGroups.length > 0,
    tagGroups,
  }

  return engine.parseAndRenderSync(overviewTemplate, data)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Load a Liquid template from the package templates directory.
 *
 * @private
 * @param filename - Template filename
 * @returns Raw template string
 */
function loadTemplate(filename: string): string {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- safe: reads from known templates directory
  return readFileSync(join(import.meta.dirname, '..', 'templates', filename), 'utf8')
}

/**
 * Flatten parameter groups into template-friendly arrays.
 *
 * @private
 * @param parameters - OpenAPI parameter objects
 * @returns Array of groups with label and items
 */
function flattenParameterGroups(parameters: readonly Record<string, unknown>[]): readonly {
  readonly label: string
  readonly items: readonly {
    readonly name: string
    readonly type: string
    readonly required: string
    readonly description: string
  }[]
}[] {
  const groups = groupParametersByIn(parameters)
  return groups.map((group) => ({
    label: group.label,
    items: group.items.map((param) => ({
      name: String(param['name'] ?? ''),
      type: extractParamType(param),
      required: match(param['required'] === true)
        .with(true, () => 'Yes')
        .otherwise(() => 'No'),
      description: String(param['description'] ?? ''),
    })),
  }))
}

/**
 * Flatten a request body into template-friendly shape.
 *
 * @private
 * @param requestBody - OpenAPI request body object or undefined
 * @returns Flattened request body or undefined
 */
function flattenRequestBody(requestBody: Record<string, unknown> | undefined):
  | {
      readonly description: string | undefined
      readonly contentType: string
      readonly schema: string | null
      readonly example: string | null
    }
  | undefined {
  if (requestBody === undefined) {
    return undefined
  }

  const description = requestBody['description'] as string | undefined
  const content = requestBody['content'] as Record<string, Record<string, unknown>> | undefined

  if (content === null || content === undefined) {
    return { description, contentType: 'application/json', schema: null, example: null }
  }

  const entries = Object.entries(content)
  if (entries.length === 0) {
    return { description, contentType: 'application/json', schema: null, example: null }
  }

  const [[contentType, mediaType]] = entries
  const schema = mediaType['schema'] as Record<string, unknown> | undefined
  const schemaText = match(schema)
    .with(P.nonNullable, (s) => renderSchemaText(s, 0))
    .otherwise(() => null)
  const example = mediaType['example'] as unknown

  return {
    description,
    contentType,
    schema: schemaText,
    example: match(example)
      .with(P.nonNullable, (ex) => JSON.stringify(ex, null, 2))
      .otherwise(() => null),
  }
}

/**
 * Flatten responses into template-friendly array.
 *
 * @private
 * @param responses - OpenAPI responses object keyed by status code
 * @returns Array of response objects with code, description, and optional schema
 */
function flattenResponses(responses: Record<string, unknown>): readonly {
  readonly code: string
  readonly description: string
  readonly schema: string | null
}[] {
  return Object.entries(responses).map(([code, value]) => {
    const response = (value ?? {}) as Record<string, unknown>
    const description = String(response['description'] ?? '')
    const schema = extractResponseSchema(response)
    return {
      code,
      description,
      schema: match(schema)
        .with(P.nonNullable, (s) => renderSchemaText(s, 0))
        .otherwise(() => null),
    }
  })
}

/**
 * Flatten security requirements into template-friendly text lines.
 *
 * @private
 * @param securities - Security requirement objects
 * @returns Array of objects with display text
 */
function flattenSecurities(
  securities: readonly Record<string, unknown>[]
): readonly { readonly text: string }[] {
  return securities.map((requirement, index) => {
    const schemes = Object.entries(requirement).map(([name, scopes]) => {
      const scopeSuffix = match(scopes)
        .with(
          P.when((s): s is readonly string[] => Array.isArray(s) && s.length > 0),
          (s) => ` (${s.join(', ')})`
        )
        .otherwise(() => '')
      return `${name}${scopeSuffix}`
    })

    if (schemes.length === 0) {
      return { text: 'No authentication' }
    }

    const prefix = match(securities.length > 1)
      .with(true, () => `Option ${String(index + 1)}: `)
      .otherwise(() => '')
    return { text: `${prefix}${schemes.join(' + ')}` }
  })
}

/**
 * Collect tag groups with operation counts from the spec.
 *
 * @private
 * @param spec - Parsed OpenAPI spec
 * @returns Array of tag groups with name and count
 */
function collectTagGroups(
  spec: Record<string, unknown>
): readonly { readonly name: string; readonly count: number }[] {
  const paths = (spec['paths'] ?? {}) as Record<string, Record<string, unknown>>

  const allTags = Object.values(paths).flatMap((pathItem) =>
    HTTP_METHODS.filter((method) => pathItem[method] !== undefined).flatMap((method) => {
      const operation = pathItem[method] as Record<string, unknown>
      return (operation['tags'] ?? ['default']) as readonly string[]
    })
  )

  if (allTags.length === 0) {
    return []
  }

  const tagCounts = Map.groupBy(allTags, (tag) => tag)
  return [...tagCounts.entries()].map(([name, occurrences]) => ({
    name,
    count: occurrences.length,
  }))
}

/**
 * Build a cURL command string for the operation.
 *
 * @private
 * @param method - HTTP method
 * @param urlPath - URL path template
 * @param baseUrl - API base URL
 * @param requestBody - Optional request body object
 * @returns cURL command string
 */
function buildCurl(
  method: string,
  urlPath: string,
  baseUrl: string,
  requestBody: Record<string, unknown> | undefined
): string {
  const normalizedMethod = method.toLowerCase()
  const url = `${baseUrl}${urlPath}`
  const upper = normalizedMethod.toUpperCase()

  const headerPart = match(isBodyMethod(normalizedMethod))
    .with(true, () => " \\\n  -H 'Content-Type: application/json'")
    .otherwise(() => '')

  const bodyExample = extractBodyExample(requestBody)
  const bodyPart = match(bodyExample)
    .with(P.nonNullable, (ex) => ` \\\n  -d ${shellQuote(JSON.stringify(ex))}`)
    .otherwise(() => '')

  return `curl -X ${upper} ${shellQuote(url)}${headerPart}${bodyPart}`
}

/**
 * Shell-quote a string for use in cURL commands.
 *
 * @private
 * @param value - String to quote
 * @returns Shell-quoted string
 */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

/**
 * Recursively render a JSON Schema as a plain-text markdown string.
 *
 * @private
 * @param schema - JSON Schema object
 * @param depth - Current nesting depth (max 4)
 * @returns Text representation of the schema
 */
function renderSchemaText(schema: Record<string, unknown>, depth: number): string {
  if (depth > 4) {
    return '_...(nested)_'
  }

  const schemaType = String(schema['type'] ?? '')
  const description = schema['description'] as string | undefined

  const oneOf = schema['oneOf'] as readonly Record<string, unknown>[] | undefined
  if (oneOf !== undefined) {
    const variants = oneOf.map((v, i) => `  ${String(i + 1)}. ${renderSchemaText(v, depth + 1)}`)
    return ['**One of:**', ...variants].join('\n')
  }

  const anyOf = schema['anyOf'] as readonly Record<string, unknown>[] | undefined
  if (anyOf !== undefined) {
    const variants = anyOf.map((v, i) => `  ${String(i + 1)}. ${renderSchemaText(v, depth + 1)}`)
    return ['**Any of:**', ...variants].join('\n')
  }

  if (schemaType === 'object') {
    return renderObjectSchema(schema, depth, description)
  }

  if (schemaType === 'array') {
    const items = (schema['items'] ?? {}) as Record<string, unknown>
    const itemDesc = renderSchemaText(items, depth + 1)
    const descSuffix = match(description)
      .with(P.nonNullable, (d) => ` — ${d}`)
      .otherwise(() => '')
    return `array of ${itemDesc}${descSuffix}`
  }

  const enumValues = schema['enum'] as readonly unknown[] | undefined
  const enumSuffix = match(enumValues)
    .with(
      P.when((e): e is readonly unknown[] => e !== undefined && e.length > 0),
      (e) => ` (enum: ${e.map(String).join(', ')})`
    )
    .otherwise(() => '')
  const descSuffix = match(description)
    .with(P.nonNullable, (d) => ` — ${d}`)
    .otherwise(() => '')

  return `\`${schemaType}\`${enumSuffix}${descSuffix}`
}

/**
 * Render an object schema as markdown with property listing.
 *
 * @private
 * @param schema - Object JSON Schema
 * @param depth - Current nesting depth
 * @param description - Optional schema description
 * @returns Markdown representation
 */
function renderObjectSchema(
  schema: Record<string, unknown>,
  depth: number,
  description: string | undefined
): string {
  const properties = (schema['properties'] ?? {}) as Record<string, Record<string, unknown>>
  const requiredList = (schema['required'] ?? []) as readonly string[]
  const propEntries = Object.entries(properties)

  const descSuffix = match(description)
    .with(P.nonNullable, (d) => ` — ${d}`)
    .otherwise(() => '')

  if (propEntries.length === 0) {
    return `\`object\`${descSuffix}`
  }

  const indent = '  '.repeat(depth)
  const rows = propEntries.map(([name, propSchema]) => {
    const required = match(requiredList.includes(name))
      .with(true, () => ' **(required)**')
      .otherwise(() => '')
    const propDesc = renderSchemaText(propSchema, depth + 1)
    return `${indent}- \`${name}\`${required}: ${propDesc}`
  })

  return [`\`object\`${descSuffix}`, ...rows].join('\n')
}

/**
 * Extract the type string from a parameter's schema.
 *
 * @private
 * @param param - OpenAPI parameter object
 * @returns Type string or dash placeholder
 */
function extractParamType(param: Record<string, unknown>): string {
  // OpenAPI 3.x: param.schema.type
  const schema = param['schema'] as Record<string, unknown> | undefined
  if (schema !== undefined && schema['type'] !== undefined) {
    return String(schema['type'])
  }
  // Swagger 2.0: param.type (directly on parameter)
  return String(param['type'] ?? '—')
}

/**
 * Extract the response schema from the first content type entry.
 *
 * @private
 * @param response - OpenAPI response object
 * @returns Schema object or null
 */
function extractResponseSchema(response: Record<string, unknown>): Record<string, unknown> | null {
  // OpenAPI 3.x: response.content[mediaType].schema
  const content = response['content'] as Record<string, Record<string, unknown>> | undefined
  if (content !== null && content !== undefined) {
    const entries = Object.entries(content)
    if (entries.length > 0) {
      const [[, mediaType]] = entries
      return (mediaType['schema'] ?? null) as Record<string, unknown> | null
    }
  }

  // Swagger 2.0: response.schema (no content wrapper)
  const directSchema = response['schema'] as Record<string, unknown> | undefined
  return match(directSchema)
    .with(P.nonNullable, (s) => s)
    .otherwise(() => null)
}
