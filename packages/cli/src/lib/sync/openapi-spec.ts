/**
 * OpenAPI spec utility functions shared by the sync engine and markdown renderer.
 *
 * Pure functions for resolving operations, parameters, security requirements,
 * and other data from a parsed OpenAPI spec object.
 */

import { match, P } from 'ts-pattern'

/**
 * All HTTP methods recognised by the OpenAPI specification.
 */
export const HTTP_METHODS: readonly string[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
]

/**
 * A group of parameters sharing the same `in` location.
 */
export interface ParameterGroup {
  readonly label: string
  readonly items: readonly Record<string, unknown>[]
}

/**
 * Resolve an operation object from the spec by path and method.
 *
 * @param input - Spec object, URL path, and HTTP method
 * @returns The matched operation object or null if not found
 */
export function resolveOperation(input: {
  readonly spec: Record<string, unknown>
  readonly path: string
  readonly method: string
}): Record<string, unknown> | null {
  const paths = input.spec['paths'] as Record<string, Record<string, unknown>> | undefined
  return match(paths)
    .with(P.nonNullable, (p) => {
      const pathItem = p[input.path]
      return match(pathItem)
        .with(P.nonNullable, (pi) => {
          const op = pi[input.method.toLowerCase()]
          return match(op)
            .with(P.nonNullable, (o) => o as Record<string, unknown>)
            .otherwise(() => null)
        })
        .otherwise(() => null)
    })
    .otherwise(() => null)
}

/**
 * Extract the first server URL from the spec, falling back to a placeholder.
 *
 * @param spec - Parsed OpenAPI spec object
 * @returns First server URL string or `'https://api.example.com'`
 */
export function resolveBaseUrl(spec: Record<string, unknown>): string {
  const servers = spec['servers'] as readonly Record<string, unknown>[] | undefined
  return match(servers)
    .with(
      P.when((s): s is readonly Record<string, unknown>[] => s !== undefined && s.length > 0),
      (s) => String(s[0]['url'] ?? 'https://api.example.com')
    )
    .otherwise(() => 'https://api.example.com')
}

/**
 * Resolve security requirements from the operation or global spec.
 *
 * @param input - Operation object and full spec object
 * @returns Array of security requirement objects (operation-level takes precedence)
 */
export function resolveSecurities(input: {
  readonly operation: Record<string, unknown>
  readonly spec: Record<string, unknown>
}): readonly Record<string, unknown>[] {
  const opSecurity = input.operation['security'] as readonly Record<string, unknown>[] | undefined
  const globalSecurity = input.spec['security'] as readonly Record<string, unknown>[] | undefined
  return match(opSecurity)
    .with(P.nonNullable, (s) => s)
    .otherwise(() =>
      match(globalSecurity)
        .with(P.nonNullable, (s) => s)
        .otherwise(() => [] as readonly Record<string, unknown>[])
    )
}

/**
 * Extract the first example value from a request body's content map.
 *
 * @param requestBody - OpenAPI request body object, or undefined
 * @returns The first example value found, or null
 */
export function extractBodyExample(
  requestBody: Record<string, unknown> | undefined
): unknown | null {
  return match(requestBody)
    .with(P.nonNullable, (rb) => {
      const content = rb['content'] as Record<string, Record<string, unknown>> | undefined
      return match(content)
        .with(P.nonNullable, (c) => {
          const entries = Object.entries(c)
          return match(entries)
            .with(
              P.when((e): e is [string, Record<string, unknown>][] => e.length > 0),
              (e) => {
                const [[, mediaType]] = e
                const { example } = mediaType as { readonly example?: unknown }
                return match(example)
                  .with(P.nonNullable, (ex) => ex)
                  .otherwise(() => null)
              }
            )
            .otherwise(() => null)
        })
        .otherwise(() => null)
    })
    .otherwise(() => null)
}

/**
 * Check if an HTTP method typically carries a request body.
 *
 * @param method - Lowercase HTTP method string
 * @returns True if the method is POST, PUT, or PATCH
 */
export function isBodyMethod(method: string): boolean {
  return method === 'post' || method === 'put' || method === 'patch'
}

/**
 * Group parameters by their `in` field (path, query, header, etc.).
 *
 * @param params - OpenAPI parameter objects
 * @returns Array of parameter groups
 */
export function groupParametersByIn(
  params: readonly Record<string, unknown>[]
): readonly ParameterGroup[] {
  const grouped = Map.groupBy(params, (param) => String(param['in'] ?? 'other'))
  return [...grouped.entries()].map(([label, items]) => ({ label, items }))
}
