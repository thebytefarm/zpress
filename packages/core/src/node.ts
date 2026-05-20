/**
 * Node-only public surface for `@zpress/core`.
 *
 * Everything reachable from here may import `node:*` modules, the filesystem,
 * `fast-glob`, `swagger-parser`, or other Node-only deps. Consumers in the
 * client bundle MUST NOT import this entry — use `@zpress/core` (main entry)
 * for types and pure helpers.
 *
 * Re-exports the entire client-safe surface so Node-side consumers (the CLI,
 * external tools running sync) can import everything from a single path.
 */

// Re-export the client-safe surface so consumers only need one import path.
export * from './index.ts'

// ─── Config loader (Node — uses c12, jiti, fs) ───────────────────────────
export { loadConfig } from './config.ts'

// ─── Path helpers (uses node:path) ───────────────────────────────────────
export { createPaths } from './paths.ts'

// ─── Sync engine (uses fs, swagger-parser, fast-glob) ────────────────────
export { sync } from './sync/index.ts'
export { resolveEntries } from './sync/resolve/index.ts'
export { loadManifest } from './sync/manifest.ts'
export { checkWorkspaceIncludes } from './sync/workspace.ts'

// ─── Asset generation (uses fs) ──────────────────────────────────────────
export {
  generateAssets,
  generateBannerSvg,
  generateIconSvg,
  generateLogoSvg,
} from './banner/index.ts'
export type { AssetConfig, AssetError, AssetResult, GeneratedAsset } from './banner/index.ts'
