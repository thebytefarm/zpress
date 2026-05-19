/**
 * Config-only entry point for `@zpress/kit` — re-exports `defineConfig` and
 * all config-related types from `@zpress/core`.
 *
 * @module
 */
export { defineConfig } from '@zpress/core'

export type {
  ZpressConfig,
  Section,
  Feature,
  Workspace,
  WorkspaceGroup,
  Frontmatter,
  NavItem,
  CardConfig,
  IconConfig,
  IconColor,
  IconId,
  SidebarConfig,
  SidebarLink,
} from '@zpress/core'
