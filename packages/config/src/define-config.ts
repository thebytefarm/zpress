import type { ZpressConfig } from './types.ts'

/**
 * Type-safe config helper for zpress.config.ts files.
 *
 * Provides type safety and editor autocompletion.
 * Validation is deferred to loadConfig at runtime.
 *
 * @param config - Zpress config object
 * @returns The config unchanged
 */
export function defineConfig(config: ZpressConfig): ZpressConfig {
  return config
}
