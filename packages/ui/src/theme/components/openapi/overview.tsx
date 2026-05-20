import { match, P } from 'massaman/match'
import type React from 'react'
import { useMemo } from 'react'

import { LockIcon } from './icons'
import { HTTP_METHODS } from './spec-utils'

export interface OpenAPIOverviewProps {
  /**
   * Parsed OpenAPI spec object.
   */
  readonly spec: Record<string, unknown>
  /**
   * Pre-rendered markdown for the SSG-MD pass.
   * When provided and `import.meta.env.SSG_MD` is true, this string
   * is rendered instead of the interactive UI.
   */
  readonly markdown?: string
}

interface TagInfo {
  readonly name: string
  readonly description: string
  readonly operationCount: number
}

/**
 * API overview page component.
 *
 * Renders the API title, version, description, server URLs,
 * authentication schemes, and tag groups with operation counts.
 *
 * @param props - Overview props with parsed spec
 * @returns React element with full API overview
 */
export function OpenAPIOverview({ spec, markdown }: OpenAPIOverviewProps): React.ReactElement {
  if (import.meta.env.SSG_MD && markdown) {
    return <>{markdown}</>
  }

  const info = (spec['info'] ?? {}) as Record<string, unknown>
  const description = info['description'] as string | undefined
  const servers = (spec['servers'] ?? []) as readonly Record<string, unknown>[]
  const components = (spec['components'] ?? {}) as Record<string, unknown>
  const securitySchemes = (components['securitySchemes'] ?? {}) as Record<
    string,
    Record<string, unknown>
  >
  const tags = useMemo(() => collectTags(spec), [spec])

  const descEl = match(description)
    .with(P.nonNullable, (d) => <div className="zp-oas-overview__description">{d}</div>)
    .otherwise(() => null)

  return (
    <div className="zp-oas-overview">
      {descEl}
      <ServerList servers={servers} />
      <AuthSchemes schemes={securitySchemes} />
      <TagGroups tags={tags} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Collect all tags from the spec and count their operations.
 *
 * @private
 * @param spec - Parsed OpenAPI spec object
 * @returns Array of tag info with operation counts
 */
function collectTags(spec: Record<string, unknown>): readonly TagInfo[] {
  const paths = (spec['paths'] ?? {}) as Record<string, Record<string, unknown>>

  const tagMap = Object.entries(paths).reduce<Record<string, number>>(
    (pathAcc, [_pathStr, pathItem]) =>
      HTTP_METHODS.filter((method) => pathItem[method] !== undefined).reduce<
        Record<string, number>
      >((methodAcc, method) => {
        const operation = pathItem[method] as Record<string, unknown>
        const tags = (operation['tags'] ?? ['default']) as readonly string[]
        return tags.reduce<Record<string, number>>(
          (tagAcc, tag) => Object.assign(tagAcc, { [tag]: (tagAcc[tag] ?? 0) + 1 }),
          methodAcc
        )
      }, pathAcc),
    {}
  )

  const specTags = (spec['tags'] ?? []) as readonly Record<string, unknown>[]
  const specTagMap = Object.fromEntries(
    specTags.map((t) => [String(t['name'] ?? ''), String(t['description'] ?? '')])
  )

  return Object.entries(tagMap).map(([name, count]) => ({
    name,
    description: specTagMap[name] ?? '',
    operationCount: count,
  }))
}

/**
 * Render the server list section.
 *
 * @private
 * @param props - Props with servers array
 * @returns Server list element or null
 */
function ServerList({
  servers,
}: {
  readonly servers: readonly Record<string, unknown>[]
}): React.ReactElement | null {
  return match(servers)
    .with(
      P.when((s): s is readonly Record<string, unknown>[] => s.length > 0),
      (s) => (
        <div className="zp-oas-servers">
          <div className="zp-oas-overview__section-title">Servers</div>
          {s.map((server) => {
            const url = String(server['url'] ?? '')
            const description = server['description'] as string | undefined
            const descEl = match(description)
              .with(P.nonNullable, (d) => (
                <span className="zp-oas-server__description">{` — ${d}`}</span>
              ))
              .otherwise(() => null)
            return (
              <div key={url} className="zp-oas-server">
                <span className="zp-oas-server__url">{url}</span>
                {descEl}
              </div>
            )
          })}
        </div>
      )
    )
    .otherwise(() => null)
}

/**
 * Render the authentication schemes section.
 *
 * @private
 * @param props - Props with security schemes
 * @returns Auth schemes element or null
 */
function AuthSchemes({
  schemes,
}: {
  readonly schemes: Record<string, Record<string, unknown>>
}): React.ReactElement | null {
  const entries = Object.entries(schemes)
  return match(entries)
    .with(
      P.when((e): e is [string, Record<string, unknown>][] => e.length > 0),
      (e) => (
        <div className="zp-oas-auth-schemes">
          <div className="zp-oas-overview__section-title">Authentication</div>
          {e.map(([name, scheme]) => (
            <div key={name} className="zp-oas-auth-scheme">
              <LockIcon />
              <span className="zp-oas-auth-scheme__name">{name}</span>
              <span className="zp-oas-auth-scheme__type">{String(scheme['type'] ?? '')}</span>
            </div>
          ))}
        </div>
      )
    )
    .otherwise(() => null)
}

/**
 * Render the tag groups section with operation counts.
 *
 * @private
 * @param props - Props with tags array
 * @returns Tag groups element or null
 */
function TagGroups({ tags }: { readonly tags: readonly TagInfo[] }): React.ReactElement | null {
  return match(tags)
    .with(
      P.when((t): t is readonly TagInfo[] => t.length > 0),
      (t) => (
        <div className="zp-oas-tags">
          <div className="zp-oas-overview__section-title">Operations</div>
          {t.map((tag) => {
            const descEl = match(tag.description)
              .with(
                P.when((d): d is string => d.length > 0),
                (d) => <div className="zp-oas-tag-group__description">{d}</div>
              )
              .otherwise(() => null)
            return (
              <div key={tag.name} className="zp-oas-tag-group">
                <div className="zp-oas-tag-group__header">
                  <span className="zp-oas-tag-group__name">{tag.name}</span>
                  <span className="zp-oas-tag-group__count">
                    {`${String(tag.operationCount)} operations`}
                  </span>
                </div>
                {descEl}
              </div>
            )
          })}
        </div>
      )
    )
    .otherwise(() => null)
}
