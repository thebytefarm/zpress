import { match, P } from 'massaman/match'
import type React from 'react'
import { useState } from 'react'

import { ChevronIcon } from './icons'

export interface SchemaViewerProps {
  /**
   * JSON Schema object to render.
   */
  readonly schema: Record<string, unknown>
  /**
   * Current nesting depth (max 6).
   */
  readonly depth?: number
  /**
   * Property name displayed alongside the type.
   */
  readonly name?: string
  /**
   * Whether this property is required by its parent.
   */
  readonly isRequired?: boolean
}

const MAX_DEPTH = 6

/**
 * Recursive JSON Schema renderer.
 *
 * Renders primitive types as inline badges, objects as expandable
 * property lists, arrays with item schemas, and oneOf/anyOf as
 * variant lists. Stops at depth 6.
 *
 * @param props - Schema viewer props
 * @returns React element representing the schema
 */
export function SchemaViewer({
  schema,
  depth = 0,
  name,
  isRequired = false,
}: SchemaViewerProps): React.ReactElement {
  const schemaType = String(schema['type'] ?? '')
  const description = schema['description'] as string | undefined
  const enumValues = schema['enum'] as readonly unknown[] | undefined
  const oneOf = schema['oneOf'] as readonly Record<string, unknown>[] | undefined
  const anyOf = schema['anyOf'] as readonly Record<string, unknown>[] | undefined
  const depthExceeded = depth >= MAX_DEPTH

  const nameEl = match(name)
    .with(P.nonNullable, (n) => <span className="zp-oas-schema__name">{n}</span>)
    .otherwise(() => null)

  const enumEl = match(enumValues)
    .with(
      P.when((e): e is readonly unknown[] => e !== undefined && e.length > 0),
      (e) => <EnumValues values={e} />
    )
    .otherwise(() => null)

  return match({ schemaType, oneOf, anyOf, depthExceeded })
    .with({ depthExceeded: true }, () => (
      <div className="zp-oas-schema__row">
        {nameEl}
        <span className="zp-oas-schema__type">{'...'}</span>
      </div>
    ))
    .with({ oneOf: P.nonNullable }, ({ oneOf: variants }) => (
      <>
        <div className="zp-oas-schema__row">
          {nameEl}
          <RequiredBadge show={isRequired} />
          <DescriptionText text={description} />
        </div>
        <VariantSchemas variants={variants} label="one of" depth={depth} />
      </>
    ))
    .with({ anyOf: P.nonNullable }, ({ anyOf: variants }) => (
      <>
        <div className="zp-oas-schema__row">
          {nameEl}
          <RequiredBadge show={isRequired} />
          <DescriptionText text={description} />
        </div>
        <VariantSchemas variants={variants} label="any of" depth={depth} />
      </>
    ))
    .with({ schemaType: 'object' }, () => (
      <>
        <div className="zp-oas-schema__row">
          {nameEl}
          <RequiredBadge show={isRequired} />
          <DescriptionText text={description} />
        </div>
        <ObjectProperties schema={schema} depth={depth} />
      </>
    ))
    .with({ schemaType: 'array' }, () => (
      <>
        <div className="zp-oas-schema__row">
          {nameEl}
          <RequiredBadge show={isRequired} />
          <DescriptionText text={description} />
        </div>
        <ArrayItems schema={schema} depth={depth} />
      </>
    ))
    .otherwise(() => (
      <div className="zp-oas-schema__row">
        {nameEl}
        <span className="zp-oas-schema__type">{schemaType}</span>
        <RequiredBadge show={isRequired} />
        {enumEl}
        <DescriptionText text={description} />
      </div>
    ))
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a required badge when the property is required.
 *
 * @private
 * @param props - Props with show flag
 * @returns Required badge element or null
 */
function RequiredBadge({ show }: { readonly show: boolean }): React.ReactElement | null {
  return match(show)
    .with(true, () => <span className="zp-oas-schema__required">required</span>)
    .otherwise(() => null)
}

/**
 * Render a comma-separated list of enum values.
 *
 * @private
 * @param props - Props with values array
 * @returns Enum values element
 */
function EnumValues({ values }: { readonly values: readonly unknown[] }): React.ReactElement {
  return (
    <span className="zp-oas-schema__enum">
      {'enum: '}
      {values.map(String).join(', ')}
    </span>
  )
}

/**
 * Render a description text span if text is provided.
 *
 * @private
 * @param props - Props with optional text
 * @returns Description element or null
 */
function DescriptionText({
  text,
}: {
  readonly text: string | undefined
}): React.ReactElement | null {
  return match(text)
    .with(P.nonNullable, (t) => <span className="zp-oas-schema__description">{t}</span>)
    .otherwise(() => null)
}

/**
 * Render an expandable object properties viewer.
 *
 * @private
 * @param props - Props with schema and depth
 * @returns Expandable object properties element
 */
function ObjectProperties({
  schema,
  depth,
}: {
  readonly schema: Record<string, unknown>
  readonly depth: number
}): React.ReactElement {
  const [expanded, setExpanded] = useState(depth < 2)
  const properties = (schema['properties'] ?? {}) as Record<string, Record<string, unknown>>
  const requiredList = (schema['required'] ?? []) as readonly string[]
  const propEntries = Object.entries(properties)

  function handleToggle() {
    setExpanded((prev) => !prev)
  }

  return (
    <div
      className="zp-oas-schema"
      data-expanded={match(expanded)
        .with(true, () => '' as string | null)
        .otherwise(() => null)}
    >
      <button type="button" className="zp-oas-schema__trigger" onClick={handleToggle}>
        <ChevronIcon className="zp-oas-schema__trigger-chevron" />
        <span className="zp-oas-schema__type">{'object'}</span>
        <span className="zp-oas-schema__description">
          {`{${String(propEntries.length)} properties}`}
        </span>
      </button>
      {match(expanded)
        .with(true, () => (
          <div className="zp-oas-schema__indent">
            {propEntries.map(([propName, propSchema]) => (
              <SchemaViewer
                key={propName}
                schema={propSchema}
                name={propName}
                depth={depth + 1}
                isRequired={requiredList.includes(propName)}
              />
            ))}
          </div>
        ))
        .otherwise(() => null)}
    </div>
  )
}

/**
 * Render an array items schema viewer.
 *
 * @private
 * @param props - Props with schema and depth
 * @returns Array items element
 */
function ArrayItems({
  schema,
  depth,
}: {
  readonly schema: Record<string, unknown>
  readonly depth: number
}): React.ReactElement {
  const items = (schema['items'] ?? {}) as Record<string, unknown>
  return (
    <div className="zp-oas-schema">
      <div className="zp-oas-schema__row">
        <span className="zp-oas-schema__type">{'array of'}</span>
      </div>
      <div className="zp-oas-schema__indent">
        <SchemaViewer schema={items} depth={depth + 1} />
      </div>
    </div>
  )
}

/**
 * Render variant schemas for oneOf/anyOf unions.
 *
 * @private
 * @param props - Props with variants array, label, and depth
 * @returns Variant schemas element
 */
function VariantSchemas({
  variants,
  label,
  depth,
}: {
  readonly variants: readonly Record<string, unknown>[]
  readonly label: string
  readonly depth: number
}): React.ReactElement {
  return (
    <div className="zp-oas-schema">
      <div className="zp-oas-schema__row">
        <span className="zp-oas-schema__type">{label}</span>
      </div>
      <div className="zp-oas-schema__indent">
        {variants.map((variant, idx) => (
          <SchemaViewer key={String(idx)} schema={variant} depth={depth + 1} />
        ))}
      </div>
    </div>
  )
}
