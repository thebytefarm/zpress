import { configErrorFromZod } from './errors.ts'
import type { ConfigResult } from './errors.ts'
import { zpressConfigSchema } from './schema.ts'
import type { ZpressConfig } from './types.ts'

/**
 * Validate a zpress config object using Zod schemas.
 *
 * @param config - Raw config object to validate
 * @returns ConfigResult tuple - [null, config] on success or [error, null] on failure
 */
export function validateConfig(config: unknown): ConfigResult<ZpressConfig> {
  const result = zpressConfigSchema.safeParse(config)

  if (result.success) {
    return [null, result.data]
  }

  return [configErrorFromZod(result.error), null]
}
