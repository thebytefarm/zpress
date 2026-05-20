import { match, P } from 'massaman/match'
import type React from 'react'

export interface ParametersTableProps {
  /**
   * OpenAPI parameter objects.
   */
  readonly parameters: readonly Record<string, unknown>[]
}

interface ParameterGroup {
  readonly label: string
  readonly items: readonly Record<string, unknown>[]
}

/**
 * Renders operation parameters grouped by location (path, query, header).
 *
 * Each group displays a table with name, type, required, description, and default columns.
 *
 * @param props - Parameters table props
 * @returns React element or null if no parameters
 */
export function ParametersTable({ parameters }: ParametersTableProps): React.ReactElement | null {
  const groups = groupByIn(parameters)

  return match(groups)
    .with(
      P.when((g): g is readonly ParameterGroup[] => g.length > 0),
      (g) => (
        <div className="zp-oas-parameters">
          <div className="zp-oas-parameters__title">Parameters</div>
          {g.map(renderGroup)}
        </div>
      )
    )
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Group parameters by their `in` field (path, query, header, etc.).
 *
 * @private
 * @param params - OpenAPI parameter objects
 * @returns Array of parameter groups
 */
function groupByIn(params: readonly Record<string, unknown>[]): readonly ParameterGroup[] {
  const grouped = Map.groupBy(params, (param) => String(param['in'] ?? 'other'))
  return [...grouped.entries()].map(([label, items]) => ({ label, items }))
}

/**
 * Render a required badge if the parameter is required.
 *
 * @private
 * @param param - OpenAPI parameter object
 * @returns Required badge element or null
 */
function renderRequired(param: Record<string, unknown>): React.ReactElement | null {
  return match(param['required'])
    .with(true, () => <span className="zp-oas-parameters__required">required</span>)
    .otherwise(() => null)
}

/**
 * Render a default value badge if one exists in the parameter schema.
 *
 * @private
 * @param param - OpenAPI parameter object
 * @returns Default value element or null
 */
function renderDefault(param: Record<string, unknown>): React.ReactElement | null {
  // OpenAPI 3.x: param.schema.default | Swagger 2.0: param.default
  const schemaDefault = match(param['schema'])
    .with(P.nonNullable, (schema) => (schema as Record<string, unknown>)['default'])
    .otherwise(() => null)
  const defaultValue = schemaDefault ?? param['default']

  return match(defaultValue)
    .with(P.nonNullable, (def) => <span className="zp-oas-parameters__default">{String(def)}</span>)
    .otherwise(() => null)
}

/**
 * Extract the type string from a parameter's schema.
 *
 * @private
 * @param param - OpenAPI parameter object
 * @returns Type string or dash placeholder
 */
function extractType(param: Record<string, unknown>): string {
  // OpenAPI 3.x: param.schema.type
  const schemaType = match(param['schema'])
    .with(
      P.nonNullable,
      (schema) => (schema as Record<string, unknown>)['type'] as string | undefined
    )
    .otherwise(() => null)

  // Swagger 2.0: param.type (directly on parameter)
  return String(schemaType ?? param['type'] ?? '—')
}

/**
 * Render a single parameter row in the table.
 *
 * @private
 * @param param - OpenAPI parameter object
 * @returns Table row element
 */
function renderRow(param: Record<string, unknown>): React.ReactElement {
  return (
    <tr key={String(param['name'])}>
      <td>
        <span className="zp-oas-parameters__name">{String(param['name'] ?? '')}</span>
      </td>
      <td>
        <span className="zp-oas-parameters__type">{extractType(param)}</span>
      </td>
      <td>{renderRequired(param)}</td>
      <td>{String(param['description'] ?? '')}</td>
      <td>{renderDefault(param)}</td>
    </tr>
  )
}

/**
 * Render a parameter group with its label and table.
 *
 * @private
 * @param group - Parameter group with label and items
 * @returns Group container element
 */
function renderGroup(group: ParameterGroup): React.ReactElement {
  return (
    <div key={group.label}>
      <div className="zp-oas-parameters__group-label">{group.label}</div>
      <table className="zp-oas-parameters__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>{group.items.map(renderRow)}</tbody>
      </table>
    </div>
  )
}
