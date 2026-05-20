import { screen } from '@kidd-cli/core/ui'
import { z } from 'zod'

import { DevScreen } from '../screens/dev-screen.tsx'

/**
 * Registers the `dev` CLI command to sync, watch, and start a live dev server.
 */
export default screen({
  name: 'dev',
  description: 'Run sync + watcher and start Rspress dev server',
  exit: 'manual',
  fullscreen: true,
  options: z.object({
    quiet: z.boolean().optional().default(false),
    clean: z.boolean().optional().default(false),
    port: z.number().optional(),
    theme: z.string().optional(),
    colorMode: z.enum(['dark', 'light']).optional(),
    vscode: z.boolean().optional().default(false),
  }),
  render: DevScreen,
})
