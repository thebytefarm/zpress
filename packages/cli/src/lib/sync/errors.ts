export type { ConfigError, ConfigResult } from '@zpress/config'
export { configError } from '@zpress/config'

/**
 * Error produced by the sync engine during entry resolution, page copy, or sidebar generation.
 */
export interface SyncError {
  readonly _tag: 'SyncError'
  readonly type: 'missing_from' | 'missing_link' | 'file_not_found' | 'missing_content' | 'internal'
  readonly message: string
}

/**
 * Convenience alias for sync operation results.
 *
 * Named `SyncOutcome` to avoid collision with the `SyncResult` interface
 * in `sync/index.ts` (which represents the aggregate return value of a full sync pass).
 */
export type SyncOutcome<T> = readonly [SyncError, null] | readonly [null, T]

/**
 * Create a `SyncError` value.
 *
 * @param type - Error classification
 * @param message - Human-readable description
 * @returns A frozen `SyncError` object
 */
export function syncError(type: SyncError['type'], message: string): SyncError {
  return Object.freeze({ _tag: 'SyncError' as const, type, message })
}

/**
 * Collect results from an array, short-circuiting on the first error.
 *
 * @param results - Array of Result tuples to collect
 * @returns Either the first error encountered, or an array of all success values
 */
export function collectResults<T, E>(
  results: readonly (readonly [E, null] | readonly [null, T])[]
): readonly [E, null] | readonly [null, readonly T[]] {
  return results.reduce<readonly [E, null] | readonly [null, readonly T[]]>(
    (acc, result) => {
      const [accErr] = acc
      if (accErr !== null) {
        return acc
      }
      const [err, val] = result
      if (err !== null) {
        return [err, null] as const
      }
      const [, prevValues] = acc as readonly [null, readonly T[]]
      return [null, [...prevValues, val as T]] as const
    },
    [null, []] as const
  )
}
