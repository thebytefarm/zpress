import { kebabCase } from 'massaman/string'

import type { Template, TemplateVariables } from './types.ts'

/**
 * Render a template by replacing all `{{key}}` placeholders with
 * the corresponding values from the variables map.
 *
 * @example
 * ```ts
 * const output = render(template, { title: 'Authentication' })
 * ```
 *
 * @param template - The template whose body contains `{{key}}` placeholders
 * @param variables - Key/value map used to replace each placeholder
 * @returns The rendered string with all placeholders substituted
 */
export function render(template: Template, variables: TemplateVariables): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template.body
  )
}

/**
 * Convert a title string to a kebab-case filename slug.
 *
 * @example
 * ```ts
 * toSlug('Deploy to Vercel') // 'deploy-to-vercel'
 * ```
 *
 * @param title - The human-readable title to convert
 * @returns A kebab-case slug suitable for use as a filename
 */
export function toSlug(title: string): string {
  return kebabCase(title)
}
