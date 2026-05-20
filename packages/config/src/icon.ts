import type { IconConfig as ConfigIconConfig, IconColor as ConfigIconColor } from './types.ts'

export type { IconConfig, IconColor } from './types.ts'

/**
 * Normalized icon output — always has both `id` and `color`.
 */
export interface ResolvedIcon {
  readonly id: string
  readonly color: ConfigIconColor
}

/**
 * Normalize an `IconConfig` value into a `ResolvedIcon`.
 *
 * - String → `{ id: string, color: "purple" }` (default color)
 * - Object → pass-through `{ id, color }`
 *
 * @param icon - Icon config value (string or object)
 * @returns Normalized `{ id, color }` pair
 */
export function resolveIcon(icon: ConfigIconConfig): ResolvedIcon {
  if (typeof icon === 'string') {
    return { id: icon, color: 'purple' }
  }
  return { id: icon.id, color: icon.color }
}

/**
 * Normalize an optional `IconConfig` value into a `ResolvedIcon | undefined`.
 *
 * Returns `undefined` when `icon` is `undefined`.
 *
 * @param icon - Optional icon config value
 * @returns Normalized `{ id, color }` pair, or `undefined`
 */
export function resolveOptionalIcon(icon: ConfigIconConfig | undefined): ResolvedIcon | undefined {
  if (icon === undefined) {
    return undefined
  }
  return resolveIcon(icon)
}

/**
 * Serialize a `ResolvedIcon` into the JSX-friendly format.
 *
 * When the color is `'purple'` (the default), returns just the icon id string.
 * Otherwise returns `{ id, color }` for explicit color rendering.
 * Returns `undefined` for nullish input.
 *
 * @param resolved - Resolved icon, or undefined
 * @returns String icon id, `{ id, color }` object, or `undefined`
 */
export function serializeIcon(
  resolved: ResolvedIcon | undefined
): string | { readonly id: string; readonly color: string } | undefined {
  if (resolved === undefined) {
    return undefined
  }
  if (resolved.color === 'purple') {
    return resolved.id
  }
  return { id: resolved.id, color: resolved.color }
}
