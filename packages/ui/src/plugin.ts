import path from 'node:path'

import type { RspressPlugin } from '@rspress/core'

/**
 * Rspress plugin that registers zpress theme components and styles.
 *
 * Global styles are loaded via the theme entry (theme/index.tsx)
 * CSS import — not through the plugin globalStyles property.
 * Nav-level components (e.g. BranchTag) are injected via layout
 * slot props in the custom Layout component, not globalUIComponents.
 * ThemeProvider is registered as a globalUIComponent to configure
 * the active theme on every page.
 *
 * @returns Configured RspressPlugin object
 */
export function zpressPlugin(): RspressPlugin {
  const componentsDir = path.resolve(import.meta.dirname, 'theme', 'components')

  return {
    name: 'zpress',
    globalUIComponents: [
      path.resolve(componentsDir, 'theme-provider.tsx'),
      path.resolve(componentsDir, 'edit-source-button.tsx'),
      path.resolve(componentsDir, 'nav', 'nav-logo.tsx'),
    ],
  }
}
