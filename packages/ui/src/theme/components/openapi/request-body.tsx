import { CodeBlockRuntime } from '@rspress/core/theme'
import { match, P } from 'massaman/match'
import type React from 'react'

import { SchemaViewer } from './schema-viewer'

export interface RequestBodyProps {
  /**
   * OpenAPI requestBody object.
   */
  readonly requestBody: Record<string, unknown>
}

interface ParsedContent {
  readonly contentType: string
  readonly schema: Record<string, unknown>
  readonly example: unknown | null
}

/**
 * Renders the request body section of an OpenAPI operation.
 *
 * Shows the content type, description, schema tree, and example payload.
 *
 * @param props - Request body props
 * @returns React element with request body details
 */
export function RequestBody({ requestBody }: RequestBodyProps): React.ReactElement {
  const description = requestBody['description'] as string | undefined
  const parsed = extractFirstContent(requestBody)

  const descEl = match(description)
    .with(P.nonNullable, (d) => <div className="zp-oas-request-body__description">{d}</div>)
    .otherwise(() => null)

  const bodyEl = match(parsed)
    .with(P.nonNullable, (p) => (
      <div>
        <div className="zp-oas-request-body__content-type">{p.contentType}</div>
        <SchemaViewer schema={p.schema} />
      </div>
    ))
    .otherwise(() => null)

  const exampleEl = match(parsed)
    .with(P.nonNullable, (p) =>
      match(p.example)
        .with(P.nonNullable, (ex) => (
          <CodeBlockRuntime lang="json" code={JSON.stringify(ex, null, 2)} />
        ))
        .otherwise(() => null)
    )
    .otherwise(() => null)

  return (
    <div className="zp-oas-request-body">
      <div className="zp-oas-request-body__title">Request Body</div>
      {descEl}
      {bodyEl}
      {exampleEl}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Extract the first content type entry from a request body.
 *
 * @private
 * @param requestBody - OpenAPI request body object
 * @returns Parsed content with type, schema, and example, or null
 */
function extractFirstContent(requestBody: Record<string, unknown>): ParsedContent | null {
  const content = requestBody['content'] as Record<string, Record<string, unknown>> | undefined
  return match(content)
    .with(P.nonNullable, (c) => {
      const entries = Object.entries(c)
      return match(entries)
        .with(
          P.when((e): e is [string, Record<string, unknown>][] => e.length > 0),
          (e) => {
            const [[contentType, mediaType]] = e
            const schema = (mediaType['schema'] ?? {}) as Record<string, unknown>
            const { example } = mediaType as { readonly example?: unknown }
            return { contentType, schema, example: example ?? null }
          }
        )
        .otherwise(() => null)
    })
    .otherwise(() => null)
}
