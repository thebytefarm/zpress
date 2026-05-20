import { stories, withFullScreen, withLayout } from '@kidd-cli/core/stories'
import { Alert, Box, Spacer, Spinner, Text } from '@kidd-cli/core/ui'
import { match } from 'massaman/match'
import type React from 'react'
import { z } from 'zod'

import { Banner } from '../components/banner.tsx'
import type { LogEntry } from '../screens/dev-screen.tsx'

const SAMPLE_LOG: readonly LogEntry[] = [
  {
    timestamp: '14:32:18',
    action: 'synced',
    file: 'docs/guides/deploying-to-vercel.md',
    elapsed: 12,
  },
  {
    timestamp: '14:32:15',
    action: 'synced',
    file: 'docs/getting-started/introduction.md',
    elapsed: 8,
  },
  { timestamp: '14:32:10', action: 'removed', file: 'docs/old-page.md', elapsed: 2 },
  { timestamp: '14:31:55', action: 'synced', file: 'docs/api/reference.md', elapsed: 15 },
  { timestamp: '14:31:42', action: 'restarted', file: 'zpress.config.ts', elapsed: 0 },
  { timestamp: '14:31:30', action: 'synced', file: 'docs/concepts/content.md', elapsed: 9 },
]

/**
 * Props for the story-only DevScreenPreview component.
 * Mirrors the visual states of the real DevScreen without side effects.
 */
type DevScreenPreviewProps = Record<string, unknown> & {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly errorMessage: string
  readonly watcherTag: 'idle' | 'syncing' | 'restarting' | 'error'
  readonly logEntries: number
  readonly pagesWritten: number
  readonly pagesSkipped: number
  readonly pagesRemoved: number
  readonly elapsed: number
  readonly port: number
  readonly width: number
}

/**
 * Pure visual preview of the DevScreen for the story viewer.
 *
 * @param props - DevScreen visual state props
 * @returns React element rendering the dev screen preview
 */
function DevScreenPreview(props: DevScreenPreviewProps): React.ReactElement {
  const width = Math.max(Math.floor(props.width), 2)
  const separatorWidth = Math.max(width - 2, 0)

  if (props.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <BannerBlock />
        <Box marginTop={1}>
          <Alert variant="error" title="Dev Server Error" width={width - 2}>
            {props.errorMessage}
          </Alert>
        </Box>
      </Box>
    )
  }

  if (props.phase === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <BannerBlock />
        <Box marginTop={1}>
          <Spinner label="Starting dev server..." type="dots" />
        </Box>
      </Box>
    )
  }

  const log = SAMPLE_LOG.slice(0, props.logEntries)

  return (
    <Box flexDirection="column" padding={1}>
      {/* Banner + URL */}
      <BannerBlock />
      <Box marginTop={1}>
        <Text dimColor>
          http://localhost:<Text color="cyan">{props.port}</Text>
        </Text>
        <Spacer />
        {props.watcherTag === 'idle' && <Text color="green">● Ready</Text>}
        {props.watcherTag === 'syncing' && <Spinner label="Syncing" type="dots" />}
        {props.watcherTag === 'restarting' && <Spinner label="Restarting" type="dots" />}
        {props.watcherTag === 'error' && <Text color="red">● Error</Text>}
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text dimColor>{'─'.repeat(separatorWidth)}</Text>
      </Box>

      {/* Activity log */}
      <Box flexDirection="column">
        {log.length === 0 && (
          <Box paddingLeft={1}>
            <Text dimColor>Waiting for changes...</Text>
          </Box>
        )}
        {log.map((entry, i) => (
          <LogLine key={`${entry.timestamp}-${entry.file}`} entry={entry} first={i === 0} />
        ))}
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text dimColor>{'─'.repeat(separatorWidth)}</Text>
      </Box>

      {/* Stats bar */}
      <Box paddingLeft={1}>
        <Text dimColor>
          <Text color="green">{props.pagesWritten}</Text> written
          {' · '}
          <Text color="yellow">{props.pagesSkipped}</Text> skipped
          {' · '}
          <Text color="red">{props.pagesRemoved}</Text> removed
          {' · '}
          {Math.round(props.elapsed)}ms
        </Text>
      </Box>

      {/* Hotkey bar */}
      <Box marginTop={1} paddingLeft={1}>
        <HotkeyHint label="r" description="resync" />
        <Text dimColor> · </Text>
        <HotkeyHint label="o" description="open" />
        <Text dimColor> · </Text>
        <HotkeyHint label="c" description="clear" />
        <Text dimColor> · </Text>
        <HotkeyHint label="q" description="quit" />
      </Box>
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * @private
 */
function BannerBlock(): React.ReactElement {
  return <Banner />
}

/**
 * @private
 */
function LogLine(props: { readonly entry: LogEntry; readonly first: boolean }): React.ReactElement {
  const { entry, first } = props
  const actionColors: Record<LogEntry['action'], string> = {
    synced: 'green',
    removed: 'red',
    restarted: 'yellow',
    error: 'red',
  }
  const actionColor = actionColors[entry.action]
  const resolvedColor = match(first)
    .with(true, () => actionColor)
    // oxlint-disable-next-line unicorn/no-useless-undefined -- match requires explicit return
    .otherwise(() => undefined)

  return (
    <Box paddingLeft={1}>
      <Text dimColor={!first}>{entry.timestamp}</Text>
      <Text> </Text>
      <Text color={resolvedColor} dimColor={!first}>
        {entry.action.padEnd(10)}
      </Text>
      <Text dimColor={!first}>{entry.file}</Text>
      {entry.elapsed > 0 && <Text dimColor> {Math.round(entry.elapsed)}ms</Text>}
    </Box>
  )
}

/**
 * @private
 */
function HotkeyHint(props: {
  readonly label: string
  readonly description: string
}): React.ReactElement {
  return (
    <Text>
      <Text bold color="cyan">
        {props.label}
      </Text>
      <Text dimColor> {props.description}</Text>
    </Text>
  )
}

const schema = z.object({
  phase: z.enum(['loading', 'ready', 'error']).default('ready'),
  errorMessage: z.string().default('Config file not found'),
  watcherTag: z.enum(['idle', 'syncing', 'restarting', 'error']).default('idle'),
  logEntries: z.number().default(6),
  pagesWritten: z.number().default(3),
  pagesSkipped: z.number().default(42),
  pagesRemoved: z.number().default(0),
  elapsed: z.number().default(187),
  port: z.number().default(3000),
  width: z.number().default(80),
})

/**
 * Stories for the DevScreen TUI component.
 */
export default stories<DevScreenPreviewProps>({
  title: 'DevScreen',
  component: DevScreenPreview,
  schema,
  defaults: {
    port: 3000,
    pagesWritten: 3,
    pagesSkipped: 42,
    pagesRemoved: 0,
    elapsed: 187,
    logEntries: 6,
    errorMessage: 'Config file not found',
    width: 80,
  },
  decorators: [withLayout({ width: 80, padding: 0 })],
  stories: {
    Loading: {
      props: { phase: 'loading' },
      description: 'Initial loading state with styled banner',
    },
    'Idle (No Activity)': {
      props: {
        phase: 'ready',
        watcherTag: 'idle',
        logEntries: 0,
      },
      description: 'Ready state before any file changes',
    },
    'Idle (With Log)': {
      props: {
        phase: 'ready',
        watcherTag: 'idle',
        logEntries: 6,
        pagesWritten: 12,
        pagesSkipped: 35,
        elapsed: 342,
      },
      description: 'Watching with activity log populated',
    },
    Syncing: {
      props: {
        phase: 'ready',
        watcherTag: 'syncing',
        logEntries: 3,
      },
      description: 'File change detected, sync in progress',
    },
    Restarting: {
      props: {
        phase: 'ready',
        watcherTag: 'restarting',
        logEntries: 5,
      },
      description: 'Config change detected, dev server restarting',
    },
    'Watcher Error': {
      props: {
        phase: 'ready',
        watcherTag: 'error',
        logEntries: 2,
      },
      description: 'Watcher encountered an error (e.g. ENOSPC)',
    },
    'Fatal Error': {
      props: { phase: 'error' },
      description: 'Fatal startup error — config missing or invalid',
    },
    Fullscreen: {
      props: {
        phase: 'ready',
        watcherTag: 'idle',
        logEntries: 6,
        pagesWritten: 12,
        pagesSkipped: 35,
        elapsed: 342,
      },
      decorators: [withFullScreen()],
      description: 'Fullscreen mode as rendered in the real dev command',
    },
  },
})
