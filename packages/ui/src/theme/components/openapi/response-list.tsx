import { match, P } from 'massaman/match'
import type React from 'react'
import { Button, Disclosure, DisclosurePanel } from 'react-aria-components'

import { ChevronIcon } from './icons'
import { SchemaViewer } from './schema-viewer'

export interface ResponseListProps {
  /**
   * OpenAPI responses object keyed by status code.
   */
  readonly responses: Record<string, unknown>
}

/**
 * Renders the list of response status codes for an OpenAPI operation.
 *
 * Each response is collapsible via react-aria-components Disclosure,
 * showing the response schema when expanded.
 *
 * @param props - Response list props
 * @returns React element with collapsible response entries
 */
export function ResponseList({ responses }: ResponseListProps): React.ReactElement {
  const entries = Object.entries(responses)

  return (
    <div className="zp-oas-responses">
      <div className="zp-oas-responses__title">Responses</div>
      {entries.map(renderResponseItem)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Determine the CSS class for a status code badge.
 *
 * @private
 * @param code - HTTP status code string
 * @returns CSS class name for the status code range
 */
function statusClass(code: string): string {
  return match(code.charAt(0))
    .with('2', () => 'zp-oas-response__status--2xx')
    .with('3', () => 'zp-oas-response__status--3xx')
    .with('4', () => 'zp-oas-response__status--4xx')
    .with('5', () => 'zp-oas-response__status--5xx')
    .otherwise(() => '')
}

/**
 * Extract the schema from a response's first content type entry.
 *
 * @private
 * @param response - OpenAPI response object
 * @returns Schema object or null
 */
function extractSchema(response: Record<string, unknown>): Record<string, unknown> | null {
  // OpenAPI 3.x: response.content[mediaType].schema
  const content = response['content'] as Record<string, Record<string, unknown>> | undefined
  const contentSchema = match(content)
    .with(P.nonNullable, (c) => {
      const entries = Object.entries(c)
      return match(entries)
        .with(
          P.when((e): e is [string, Record<string, unknown>][] => e.length > 0),
          (e) => {
            const [[, mediaType]] = e
            return (mediaType['schema'] ?? null) as Record<string, unknown> | null
          }
        )
        .otherwise(() => null)
    })
    .otherwise(() => null)

  if (contentSchema !== null) {
    return contentSchema
  }

  // Swagger 2.0: response.schema (no content wrapper)
  return match(response['schema'] as Record<string, unknown> | undefined)
    .with(P.nonNullable, (s) => s)
    .otherwise(() => null)
}

/**
 * Render a single response item as a collapsible disclosure.
 *
 * @private
 * @param entry - Tuple of [status code, response value]
 * @returns Collapsible response element
 */
function renderResponseItem([code, value]: readonly [string, unknown]): React.ReactElement {
  const response = (value ?? {}) as Record<string, unknown>
  const description = String(response['description'] ?? '')
  const schema = extractSchema(response)

  const schemaEl = match(schema)
    .with(P.nonNullable, (s) => <SchemaViewer schema={s} />)
    .otherwise(() => <div className="zp-oas-response__description">No response body</div>)

  return (
    <Disclosure key={code} className="zp-oas-response">
      <Button className="zp-oas-response__trigger" slot="trigger">
        <span className={`zp-oas-response__status ${statusClass(code)}`}>{code}</span>
        <span className="zp-oas-response__description">{description}</span>
        <ChevronIcon className="zp-oas-response__chevron" />
      </Button>
      <DisclosurePanel>
        <div className="zp-oas-response__content">{schemaEl}</div>
      </DisclosurePanel>
    </Disclosure>
  )
}
