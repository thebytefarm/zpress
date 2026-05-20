import type { Workspace, ZpressConfig } from './types.ts'

/**
 * Collect all workspace items from apps, packages, and workspace categories.
 *
 * Merges the three workspace sources in display order:
 * apps → packages → custom workspace category items.
 *
 * @param config - zpress config containing apps, packages, and workspaces
 * @returns Flat array of all workspace items
 */
export function collectAllWorkspaceItems(config: ZpressConfig): readonly Workspace[] {
  return [
    ...(config.apps ?? []),
    ...(config.packages ?? []),
    ...(config.workspaces ?? []).flatMap((g) => g.items),
  ]
}
