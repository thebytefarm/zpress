import { isFunction } from 'massaman/predicate'

import { getBuiltInTemplates } from './built-in.ts'
import type { ExtendTemplateOptions, Template, TemplateRegistry } from './types.ts'

/**
 * Create a template registry, optionally pre-loaded with the given templates.
 *
 * When called with no arguments, the registry is populated with all built-in
 * templates. Pass an explicit array to provide a custom set, or an empty array
 * to start from scratch.
 *
 * @example
 * ```ts
 * import { createRegistry } from '@zpress/templates'
 *
 * // Use built-in templates as-is
 * const registry = createRegistry()
 * const guide = registry.get('guide')
 * ```
 *
 * @example
 * ```ts
 * // Start with an empty registry
 * const registry = createRegistry([])
 *   .add(defineTemplate({
 *     type: 'adr',
 *     label: 'ADR',
 *     hint: 'Architecture decision record',
 *     body: '# {{title}}\n\n## Context\n\n## Decision\n\n## Consequences\n',
 *   }))
 * ```
 *
 * @example
 * ```ts
 * // Extend a built-in template
 * const registry = createRegistry()
 *   .extend('guide', {
 *     body: (base) => base + '\n## Internal Notes\n',
 *   })
 * ```
 *
 * @param templates - Optional array of templates to seed the registry with.
 *   Defaults to built-in templates when omitted.
 * @returns Template registry
 */
export function createRegistry(templates?: readonly Template[]): TemplateRegistry {
  const entries: ReadonlyMap<string, Template> = resolveEntries(templates)
  return createFromMap(entries)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Resolve template entries from optional input, defaulting to built-in templates.
 *
 * @private
 * @param templates - Optional array of templates
 * @returns ReadonlyMap of template type to template
 */
function resolveEntries(templates: readonly Template[] | undefined): ReadonlyMap<string, Template> {
  if (templates === undefined) {
    return new Map(Object.entries(getBuiltInTemplates()))
  }
  return new Map(templates.map((t) => [t.type, t]))
}

/**
 * Resolve the body for an extension, applying the transform function if provided.
 *
 * @private
 * @param base - Base template body string
 * @param override - Optional override: a string replacement or transform function
 * @returns Resolved body string
 */
function resolveBody(base: string, override: ExtendTemplateOptions['body']): string {
  if (override === undefined) {
    return base
  }
  if (isFunction(override)) {
    return override(base)
  }
  return override
}

/**
 * Apply extension options to a base template, producing a new template.
 *
 * @private
 * @param base - Base template to extend
 * @param options - Extension options with optional label, hint, and body overrides
 * @returns New template with overrides applied
 */
function applyExtension(base: Template, options: ExtendTemplateOptions): Template {
  return {
    type: base.type,
    label: options.label ?? base.label,
    hint: options.hint ?? base.hint,
    body: resolveBody(base.body, options.body),
  }
}

/**
 * Create a new immutable template registry from a map of templates.
 *
 * @private
 * @param templates - Immutable map of template type to template
 * @returns Template registry with get, add, extend, and merge operations
 */
function createFromMap(templates: ReadonlyMap<string, Template>): TemplateRegistry {
  return {
    templates,
    get: (type) => templates.get(type),
    has: (type) => templates.has(type),
    list: () => [...templates.values()],
    types: () => [...templates.keys()],
    add: (template) => createFromMap(new Map([...templates, [template.type, template]])),
    extend: (type, options) => {
      const base = templates.get(type)
      if (!base) {
        return createFromMap(templates)
      }
      const extended = applyExtension(base, options)
      return createFromMap(new Map([...templates, [type, extended]]))
    },
    merge: (other) => createFromMap(new Map([...templates, ...other.templates])),
  }
}
