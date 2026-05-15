import type { SyncResult } from '@zpress/core'
import { createPaths, loadConfig, sync } from '@zpress/core'
import { attemptAsync, mapValues } from 'es-toolkit'
import { useCallback, useEffect, useRef, useState } from 'react'

import { clean } from '../commands/clean.ts'
import { reportCrash } from '../lib/crash-reporter.ts'
import type {
  DevPhase,
  DevServerActions,
  DevServerState,
  LogEntry,
  WatcherCallbacks,
  WatcherHandle,
  WatcherStatus,
} from '../lib/dev-types.ts'
import { toError } from '../lib/error.ts'
import { startDevServer } from '../lib/rspress.ts'
import { createWatcher } from '../lib/watcher.ts'

/**
 * Props accepted by the useDevServer hook.
 */
export interface UseDevServerProps {
  readonly quiet?: boolean
  readonly clean?: boolean
  readonly port?: number
  readonly theme?: string
  readonly colorMode?: string
  readonly vscode?: boolean
}

/**
 * Result returned by the useDevServer hook.
 */
export interface UseDevServerResult {
  readonly state: DevServerState
  readonly actions: DevServerActions
}

/**
 * Manages the full dev server lifecycle: config loading, content sync,
 * Rspress dev server, and file watcher.
 *
 * All actions are stable functions — safe to call at any time, noops
 * when the underlying resource isn't ready yet.
 *
 * @param props - Dev server configuration from CLI options
 * @returns Read-only state snapshot and action handles
 */
export function useDevServer(props: UseDevServerProps): UseDevServerResult {
  const [phase, setPhase] = useState<DevPhase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [crashLogPath, setCrashLogPath] = useState<string | null>(null)
  const [status, setStatus] = useState<WatcherStatus>('idle')
  const [lastSync, setLastSync] = useState<SyncResult | null>(null)
  const [port, setPort] = useState(0)

  const { log, pushLog, clearLog } = useActivityLog()

  const watcher = useRef<WatcherHandle | null>(null)
  const serverClose = useRef<(() => Promise<void>) | null>(null)
  const openapiCache = useRef(new Map<string, unknown>())
  const disposed = useRef(false)
  const pendingFile = useRef<string | null>(null)

  const resync = useCallback(() => {
    if (watcher.current) {
      watcher.current.resync()
    }
  }, [])

  const close = useCallback(async () => {
    // oxlint-disable-next-line functional/immutable-data -- mark disposed to cancel in-flight init
    disposed.current = true
    if (watcher.current) {
      watcher.current.close()
    }
    const closeFn = serverClose.current
    if (closeFn) {
      await attemptAsync(closeFn)
    }
  }, [])

  useEffect(() => {
    const set = guardSetters(disposed, {
      phase: setPhase,
      error: setError,
      crashLogPath: setCrashLogPath,
      status: setStatus,
      lastSync: setLastSync,
      port: setPort,
      pushLog,
    })

    async function init() {
      const paths = createPaths(process.cwd())

      if (props.clean) {
        await clean(paths)
      }

      const [configErr, config] = await loadConfig(paths.repoRoot)
      if (configErr) {
        set.error(configErr.message)
        set.phase('error')
        return
      }

      const [syncErr, syncResult] = await attemptAsync<SyncResult, Error>(() =>
        sync(config, { paths, quiet: props.quiet ?? true, openapiCache: openapiCache.current })
      )

      if (disposed.current) {
        return
      }
      if (syncErr) {
        set.error(`Sync failed: ${syncErr.message}`)
        set.phase('error')
        return
      }
      if (syncResult.error) {
        set.error(syncResult.error)
        set.phase('error')
        return
      }

      set.lastSync(syncResult)

      const [serverErr, server] = await attemptAsync<
        Awaited<ReturnType<typeof startDevServer>>,
        Error
      >(() =>
        startDevServer({
          config,
          paths,
          port: props.port,
          theme: props.theme,
          colorMode: props.colorMode,
          vscode: props.vscode,
        })
      )

      if (disposed.current) {
        if (server) {
          await server.close()
        }
        return
      }
      if (serverErr) {
        set.error(`Dev server failed: ${serverErr.message}`)
        set.phase('error')
        return
      }

      // oxlint-disable-next-line functional/immutable-data -- ref assignment for cleanup
      serverClose.current = server.close
      set.port(server.port)

      const callbacks: WatcherCallbacks = {
        onStatusChange: set.status,
        onError: set.error,
        onSyncComplete: (result) => {
          set.lastSync(result)
          const file = pendingFile.current
          if (file) {
            set.pushLog({
              timestamp: formatTime(new Date()),
              action: 'synced',
              file,
              elapsed: result.elapsed,
            })
          }
        },
        onFileChange: (filename) => {
          // oxlint-disable-next-line functional/immutable-data -- tracks file for log attribution
          pendingFile.current = filename
        },
        onConfigReloaded: () => {
          set.pushLog({
            timestamp: formatTime(new Date()),
            action: 'restarted',
            file: pendingFile.current ?? 'zpress.config.ts',
            elapsed: 0,
          })
        },
      }

      // oxlint-disable-next-line functional/immutable-data -- ref assignment for teardown
      watcher.current = createWatcher({
        initialConfig: config,
        paths,
        callbacks,
        onConfigReload: server.onConfigReload,
        openapiCache: openapiCache.current,
      })

      set.phase('ready')
    }

    // oxlint-disable-next-line promise/prefer-await-to-callbacks unicorn/catch-error-name -- useEffect cannot be async; outer scope already binds `error`
    init().catch((cause: unknown) => {
      if (disposed.current) {
        return
      }
      const normalized = toError(cause)
      const result = reportCrash({
        error: normalized,
        source: 'middleware',
        command: 'dev',
        version: 'unknown',
      })
      set.error(normalized.message)
      if (result.ok) {
        set.crashLogPath(result.logPath)
      }
      set.phase('error')
    })

    return () => {
      // oxlint-disable-next-line functional/immutable-data -- mark disposed on unmount
      disposed.current = true
      if (watcher.current) {
        watcher.current.close()
      }
      if (serverClose.current) {
        // oxlint-disable-next-line no-empty-function -- best-effort cleanup
        serverClose.current().catch(() => {})
      }
    }
  }, [])

  return {
    state: { phase, error, crashLogPath, status, lastSync, log, port },
    actions: { resync, clearLog, close },
  }
}

// ---------------------------------------------------------------------------
// Private hooks
// ---------------------------------------------------------------------------

const MAX_LOG_ENTRIES = 50

/**
 * Manages a bounded activity log.
 *
 * @private
 * @returns Log state, push function, and clear action
 */
function useActivityLog(): {
  readonly log: readonly LogEntry[]
  readonly pushLog: (entry: LogEntry) => void
  readonly clearLog: () => void
} {
  const [log, setLog] = useState<readonly LogEntry[]>([])

  const pushLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES))
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
  }, [])

  return { log, pushLog, clearLog }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Wrap each setter so it becomes a no-op after disposal.
 *
 * @private
 * @param disposed - Ref that indicates the hook has been torn down
 * @param setters - Raw state setters keyed by name
 * @returns Guarded setters safe to call from async callbacks
 */
// oxlint-disable-next-line typescript/no-explicit-any -- generic setter signatures can't be narrowed without any
function guardSetters<T extends Record<string, (...args: readonly any[]) => void>>(
  disposed: React.RefObject<boolean>,
  setters: T
): T {
  // oxlint-disable-next-line typescript/no-explicit-any -- preserves original setter signature
  return mapValues(setters, (setter) => (...args: readonly any[]) => {
    if (!disposed.current) {
      setter(...args)
    }
  }) as T
}

/**
 * Format a Date to HH:MM:SS string.
 *
 * @private
 * @param date - Date to format
 * @returns Time string in HH:MM:SS format
 */
function formatTime(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join(':')
}
