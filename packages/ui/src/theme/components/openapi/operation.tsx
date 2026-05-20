import { match, P } from 'massaman/match'
import type React from 'react'

import { CodeSample } from './code-sample'
import { MethodBadge } from './method-badge'
import { ParametersTable } from './parameters-table'
import { RequestBody } from './request-body'
import { ResponseList } from './response-list'
import { SecurityBadges } from './security-badges'
import { resolveBaseUrl, resolveOperation, resolveSecurities } from './spec-utils'

export interface OpenAPIOperationProps {
  /**
   * Parsed OpenAPI spec object.
   */
  readonly spec: Record<string, unknown>
  /**
   * HTTP method (get, post, put, patch, delete).
   */
  readonly method: string
  /**
   * URL path (e.g. /users/{id}).
   */
  readonly path: string
  /**
   * Operation ID for identification.
   */
  readonly operationId: string
  /**
   * Pre-rendered markdown for the SSG-MD pass.
   * When provided and `import.meta.env.SSG_MD` is true, this string
   * is rendered instead of the interactive UI.
   */
  readonly markdown?: string
}

/**
 * Main OpenAPI operation page component.
 *
 * Two-column layout: left column shows spec details (header,
 * parameters, request body, responses, security), right column
 * shows auto-generated code examples.
 *
 * @param props - Operation props with spec, method, path, and operationId
 * @returns React element with operation details and code examples
 */
export function OpenAPIOperation({
  spec,
  method,
  path,
  operationId,
  markdown,
}: OpenAPIOperationProps): React.ReactElement {
  if (import.meta.env.SSG_MD && markdown) {
    return <>{markdown}</>
  }

  const operation = resolveOperation({ spec, path, method })

  return match(operation)
    .with(P.nonNullable, (op) => {
      const parameters = (op['parameters'] ?? []) as readonly Record<string, unknown>[]
      const requestBody = op['requestBody'] as Record<string, unknown> | undefined
      const responses = (op['responses'] ?? {}) as Record<string, unknown>
      const summary = op['summary'] as string | undefined
      const description = op['description'] as string | undefined
      const deprecated = op['deprecated'] === true
      const securities = resolveSecurities({ operation: op, spec })
      const baseUrl = resolveBaseUrl(spec)

      const displaySummary: string | undefined = match(summary)
        .with(P.nonNullable, (s) => s)
        .otherwise(() =>
          match(description)
            .with(P.nonNullable, (d) => d as string | undefined)
            .otherwise(() => undefined as string | undefined)
        )

      const parametersEl = match(parameters)
        .with(
          P.when((p): p is readonly Record<string, unknown>[] => p.length > 0),
          (p) => <ParametersTable parameters={p} />
        )
        .otherwise(() => null)

      const requestBodyEl = match(requestBody)
        .with(P.nonNullable, (rb) => <RequestBody requestBody={rb} />)
        .otherwise(() => null)

      const responsesEl = match(Object.keys(responses))
        .with(
          P.when((k): k is string[] => k.length > 0),
          () => <ResponseList responses={responses} />
        )
        .otherwise(() => null)

      const securityEl = match(securities)
        .with(
          P.when((s): s is readonly Record<string, unknown>[] => s.length > 0),
          (s) => <SecurityBadges securities={s} />
        )
        .otherwise(() => null)

      return (
        <div className="zp-oas-operation">
          <div className="zp-oas-operation-spec">
            <OperationHeader
              method={method}
              path={path}
              operationId={operationId}
              summary={displaySummary}
              deprecated={deprecated}
            />
            {parametersEl}
            {requestBodyEl}
            {responsesEl}
            {securityEl}
          </div>
          <div className="zp-oas-operation-examples">
            <CodeSample
              method={method}
              path={path}
              baseUrl={baseUrl}
              parameters={parameters}
              requestBody={requestBody}
            />
          </div>
        </div>
      )
    })
    .otherwise(() => <NotFound method={method} path={path} />)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render the operation header with method badge, path, and optional deprecation tag.
 *
 * @private
 * @param props - Header props including method, path, operationId, summary, and deprecated flag
 * @returns Header element
 */
function OperationHeader({
  method,
  path,
  operationId,
  summary,
  deprecated,
}: {
  readonly method: string
  readonly path: string
  readonly operationId: string
  readonly summary: string | undefined
  readonly deprecated: boolean
}): React.ReactElement {
  const summaryEl = match(summary)
    .with(P.nonNullable, (s) => <div className="zp-oas-operation-summary">{s}</div>)
    .otherwise(() => null)

  const deprecatedEl = match(deprecated)
    .with(true, () => <span className="zp-oas-operation-deprecated">Deprecated</span>)
    .otherwise(() => null)

  return (
    <div>
      <div className="zp-oas-operation-header">
        <MethodBadge method={method} />
        <span className="zp-oas-operation-header__path">{path}</span>
        {deprecatedEl}
      </div>
      <div className="zp-oas-operation-header__id">{operationId}</div>
      {summaryEl}
    </div>
  )
}

/**
 * Render a fallback when the operation is not found in the spec.
 *
 * @private
 * @param props - Props with method and path
 * @returns Not-found element
 */
function NotFound({
  method,
  path,
}: {
  readonly method: string
  readonly path: string
}): React.ReactElement {
  return (
    <div className="zp-oas-operation">
      <div className="zp-oas-operation-spec">
        <div className="zp-oas-operation-header">
          <MethodBadge method={method} />
          <span className="zp-oas-operation-header__path">{path}</span>
        </div>
        <div className="zp-oas-operation-summary">Operation not found in the provided spec.</div>
      </div>
    </div>
  )
}
