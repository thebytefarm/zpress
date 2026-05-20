/**
 * Types for auto-generated SVG banner and logo assets.
 */

import type { Result } from '@zpress/config'

/**
 * Error produced during asset generation or file writing.
 */
export interface AssetError {
  readonly _tag: 'AssetError'
  readonly type: 'empty_title' | 'write_failed' | 'mkdir_failed'
  readonly message: string
}

/**
 * Convenience alias for asset operation results.
 */
export type AssetResult<T> = Result<T, AssetError>

/**
 * Create an `AssetError` value.
 *
 * @param type - Error classification
 * @param message - Human-readable description
 * @returns A frozen `AssetError` object
 */
export function assetError(type: AssetError['type'], message: string): AssetError {
  return Object.freeze({ _tag: 'AssetError' as const, type, message })
}

/**
 * Input configuration for asset generation, extracted from ZpressConfig.
 */
export interface AssetConfig {
  readonly title: string
  readonly tagline: string | undefined
}

/**
 * A generated SVG asset ready to be written to disk.
 */
export interface GeneratedAsset {
  readonly filename: string
  readonly content: string
}
