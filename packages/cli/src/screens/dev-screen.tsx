import { execSync } from 'node:child_process'
import { platform } from 'node:os'

import {
  Alert,
  Box,
  Spacer,
  Spinner,
  Text,
  useApp,
  useFullScreen,
  useHotkey,
  useInput,
} from '@kidd-cli/core/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { match } from 'ts-pattern'

import { Banner } from '../components/banner.tsx'
import { useDevServer } from '../hooks/use-dev-server.ts'
import type { LogEntry } from '../lib/dev-types.ts'
import { openBrowser } from '../lib/rspress.ts'

export type { LogEntry } from '../lib/dev-types.ts'

const isTTY = Boolean(process.stdin.isTTY)

/**
 * Props passed to the DevScreen component by the screen() runtime.
 * These correspond to the parsed CLI options.
 */
interface DevScreenProps {
  readonly quiet?: boolean
  readonly clean?: boolean
  readonly port?: number
  readonly theme?: string
  readonly colorMode?: 'dark' | 'light'
  readonly vscode?: boolean
}

/**
 * React/Ink TUI for the `zpress dev` command.
 *
 * Renders a fullscreen status display with styled banner, activity log,
 * sync stats, and hotkey bar. All lifecycle logic is delegated to
 * the `useDevServer` hook.
 *
 * @param props - Parsed CLI options
 * @returns React element tree for the dev TUI
 */
export function DevScreen(props: DevScreenProps): React.ReactElement {
  const { exit } = useApp()
  const { columns } = useFullScreen()
  const { state, actions } = useDevServer(props)

  useHotkey({
    keys: ['r'],
    action: actions.resync,
    active: state.phase === 'ready' && isTTY,
  })

  useHotkey({
    keys: ['c'],
    action: actions.clearLog,
    active: state.phase === 'ready' && isTTY,
  })

  useHotkey({
    keys: ['o'],
    action: () => {
      openBrowser(`http://localhost:${state.port}`)
    },
    active: state.phase === 'ready' && isTTY,
  })

  useInput(
    (input, key) => {
      if (input === 'q' || (key.ctrl && input === 'c')) {
        actions.close().finally(() => {
          exit()
          process.exit(0)
        })
      }
    },
    { isActive: isTTY && state.phase !== 'error' }
  )

  const width = Math.max(Math.min(columns, 80), 2)
  const separatorWidth = Math.max(width - 2, 0)

  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = useCallback(() => {
    if (!state.crashLogPath) {
      return
    }
    if (!copyToClipboard(state.crashLogPath)) {
      return
    }
    setCopied(true)
    if (copiedTimer.current) {
      clearTimeout(copiedTimer.current)
    }
    // oxlint-disable-next-line functional/immutable-data -- timer ref for auto-clear
    copiedTimer.current = setTimeout(() => {
      setCopied(false)
    }, 2000)
  }, [state.crashLogPath])

  useEffect(
    () => () => {
      if (copiedTimer.current) {
        clearTimeout(copiedTimer.current)
      }
    },
    []
  )

  useInput(
    (input, key) => {
      if (input === 'q' || (key.ctrl && input === 'c')) {
        exit()
        process.exit(1)
      }
      if (input === 'c' && !key.ctrl && state.crashLogPath) {
        handleCopy()
      }
    },
    { isActive: isTTY && state.phase === 'error' }
  )

  if (state.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Banner />
        <Box marginTop={1}>
          <Alert variant="error" title="Fatal Error" width={width}>
            {state.error ?? 'Unknown error'}
          </Alert>
        </Box>
        {state.crashLogPath && (
          <Box marginTop={1} paddingLeft={1} flexDirection="column">
            <Text dimColor>Full log:</Text>
            <Text color="cyan">{state.crashLogPath}</Text>
          </Box>
        )}
        {copied && (
          <Box marginTop={1} paddingLeft={1}>
            <Text color="green">✓ Copied to clipboard</Text>
          </Box>
        )}
        <Box marginTop={1} paddingLeft={1}>
          {state.crashLogPath && (
            <>
              <HotkeyHint label="c" description="copy log path" />
              <Text dimColor> · </Text>
            </>
          )}
          <HotkeyHint label="q" description="quit" />
        </Box>
      </Box>
    )
  }

  if (state.phase === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <Banner />
        <Box marginTop={1}>
          <Spinner label="Starting dev server..." type="dots" />
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Banner + URL */}
      <Banner />
      <Box marginTop={1}>
        <Text dimColor>
          http://localhost:<Text color="cyan">{state.port}</Text>
        </Text>
        <Spacer />
        {match(state.status)
          .with('idle', () => <Text color="green">● Ready</Text>)
          .with('syncing', () => <Spinner label="Syncing" type="dots" />)
          .with('restarting', () => <Spinner label="Restarting" type="dots" />)
          .with('error', () => <Text color="red">● Error: {state.error}</Text>)
          .exhaustive()}
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text dimColor>{'─'.repeat(separatorWidth)}</Text>
      </Box>

      {/* Activity log */}
      <Box flexDirection="column" marginTop={0}>
        {state.log.length === 0 && (
          <Box paddingLeft={1}>
            <Text dimColor>Waiting for changes...</Text>
          </Box>
        )}
        {state.log.slice(0, 12).map((entry, i) => (
          <LogLine key={`${entry.timestamp}-${entry.file}-${i}`} entry={entry} first={i === 0} />
        ))}
      </Box>

      {/* Separator */}
      <Box marginTop={1}>
        <Text dimColor>{'─'.repeat(separatorWidth)}</Text>
      </Box>

      {/* Stats bar */}
      {state.lastSync !== null && (
        <Box paddingLeft={1}>
          <Text dimColor>
            <Text color="green">{state.lastSync.pagesWritten}</Text> written
            {' · '}
            <Text color="yellow">{state.lastSync.pagesSkipped}</Text> skipped
            {' · '}
            <Text color="red">{state.lastSync.pagesRemoved}</Text> removed
            {' · '}
            {Math.round(state.lastSync.elapsed)}ms
          </Text>
        </Box>
      )}

      {/* Hotkey bar */}
      {isTTY && (
        <Box marginTop={1} paddingLeft={1}>
          <HotkeyHint label="r" description="resync" />
          <Text dimColor> · </Text>
          <HotkeyHint label="o" description="open" />
          <Text dimColor> · </Text>
          <HotkeyHint label="c" description="clear" />
          <Text dimColor> · </Text>
          <HotkeyHint label="q" description="quit" />
        </Box>
      )}
    </Box>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a single line in the activity log.
 *
 * @private
 * @param props - Log entry data and whether this is the most recent entry
 * @returns React element for one log line
 */
function LogLine(props: { readonly entry: LogEntry; readonly first: boolean }): React.ReactElement {
  const { entry, first } = props
  const actionColor = match(entry.action)
    .with('synced', () => 'green' as const)
    .with('removed', () => 'red' as const)
    .with('restarted', () => 'yellow' as const)
    .with('error', () => 'red' as const)
    .exhaustive()
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
 * Render a single hotkey hint (e.g. "r resync").
 *
 * @private
 * @param props - Label and description for the hotkey
 * @returns React element with styled hotkey hint
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

/**
 * Copy text to the system clipboard.
 *
 * @private
 * @param text - The text to copy
 * @returns Whether the copy succeeded
 */
function copyToClipboard(text: string): boolean {
  const cmd = match(platform())
    .with('darwin', () => 'pbcopy')
    .with('win32', () => 'clip')
    .otherwise(() => 'xclip -selection clipboard')

  try {
    execSync(cmd, { input: text, stdio: ['pipe', 'ignore', 'ignore'] })
    return true
  } catch {
    return false
  }
}
