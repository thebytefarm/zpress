import type { SyncResult } from './sync/index.ts'

/**
 * A single entry in the dev server activity log.
 */
export interface LogEntry {
  readonly timestamp: string
  readonly action: 'synced' | 'removed' | 'restarted' | 'error'
  readonly file: string
  readonly elapsed: number
}

/**
 * Lifecycle phase of the dev server.
 */
export type DevPhase = 'loading' | 'ready' | 'error'

/**
 * Watcher status as a flat string.
 */
export type WatcherStatus = 'idle' | 'syncing' | 'restarting' | 'error'

/**
 * Read-only state snapshot exposed by the useDevServer hook.
 */
export interface DevServerState {
  readonly phase: DevPhase
  readonly error: string | null
  readonly crashLogPath: string | null
  readonly status: WatcherStatus
  readonly lastSync: SyncResult | null
  readonly log: readonly LogEntry[]
  readonly port: number
}

/**
 * Actions exposed by the useDevServer hook for external control.
 */
export interface DevServerActions {
  readonly resync: () => void
  readonly clearLog: () => void
  readonly close: () => Promise<void>
}

/**
 * Callback interface used by the watcher to communicate state changes
 * to the TUI layer without coupling to a specific logging implementation.
 */
export interface WatcherCallbacks {
  readonly onStatusChange: (status: WatcherStatus) => void
  readonly onError: (message: string) => void
  readonly onSyncComplete: (result: SyncResult) => void
  readonly onFileChange: (filename: string) => void
  readonly onConfigReloaded: () => void
}

/**
 * Closeable + resyncable handle returned by createWatcher.
 */
export interface WatcherHandle {
  readonly close: () => void
  readonly resync: () => void
}
