/**
 * Public API for `@zpress/kit` — re-exports all user-facing functions,
 * values, and types from `@zpress/core`, `@zpress/config`, and `@zpress/ui`.
 *
 * @module
 */
export {
  defineConfig,
  loadConfig,
  sync,
  resolveEntries,
  loadManifest,
  createPaths,
  hasGlobChars,
} from '@zpress/core'

export { defineTheme } from '@zpress/config'
export type { ZpressThemeInput } from '@zpress/config'

export { createRspressConfig, zpressPlugin } from '@zpress/ui'

export type {
  ZpressConfig,
  Section,
  Feature,
  Workspace,
  WorkspaceCategory,
  Frontmatter,
  NavItem,
  CardConfig,
  SidebarConfig,
  SidebarLink,
  ResolvedPage,
  ResolvedSection,
  Result,
  IconConfig,
  IconColor,
  IconId,
  IconPrefix,
  Paths,
  SyncResult,
  SyncOptions,
  SyncContext,
  PageData,
  ResolvedEntry,
  SidebarItem,
  Manifest,
  ManifestEntry,
} from '@zpress/core'
