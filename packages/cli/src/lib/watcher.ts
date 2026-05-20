import { createHash } from 'node:crypto'
import { watch } from 'node:fs'
import path from 'node:path'

import type { ZpressConfig } from '@zpress/config'
import { loadConfig } from '@zpress/config/loader'
import { debounce } from 'es-toolkit'
import { toError } from 'massaman/conversion'

import type { WatcherCallbacks, WatcherHandle } from './dev-types.ts'
import type { Paths } from './paths.ts'
import { sync } from './sync/index.ts'

const CONFIG_EXTENSIONS = ['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.json'] as const

const MARKDOWN_EXTENSIONS = ['.md', '.mdx'] as const

/**
 * Directories to ignore — any event whose path contains one of these
 * segments is silently dropped.
 */
const IGNORED_DIRS = new Set(['node_modules', '.git', '.zpress', 'bundle', 'dist', '.turbo'])

/**
 * Create a file watcher that re-syncs documentation on changes.
 *
 * Uses Node.js native fs.watch with recursive:true which on macOS
 * creates a single FSEvents subscription — one file descriptor for
 * the entire tree. Filtering happens in the callback, not at the
 * OS level, so there are zero EMFILE concerns.
 *
 * @param params - Watcher configuration
 * @param params.initialConfig - Initial zpress config to use for syncing
 * @param params.paths - Resolved project paths
 * @param params.callbacks - Callbacks for status changes, sync results, and file changes
 * @param params.onConfigReload - Optional async callback invoked after config reload and sync complete, receives new config
 * @param params.openapiCache - Optional shared cache of dereferenced OpenAPI specs
 * @returns Closeable and resyncable watcher handle
 */
export function createWatcher(params: {
  readonly initialConfig: ZpressConfig
  readonly paths: Paths
  readonly callbacks: WatcherCallbacks
  readonly onConfigReload?: (newConfig: ZpressConfig) => Promise<void>
  readonly openapiCache?: Map<string, unknown>
}): WatcherHandle {
  const { initialConfig, paths, callbacks, onConfigReload, openapiCache } = params
  const { repoRoot } = paths
  const configFileNames = new Set(CONFIG_EXTENSIONS.map((ext) => `zpress.config${ext}`))
  // oxlint-disable-next-line functional/no-let -- mutable config reloaded on file changes
  let config = initialConfig

  callbacks.onStatusChange('idle')

  // oxlint-disable-next-line functional/no-let -- mutable sync state for debounced watcher
  let syncing = false
  // oxlint-disable-next-line functional/no-let -- tracks whether a pending resync needs config reload
  let pendingReloadConfig: boolean | null = null
  // oxlint-disable-next-line functional/no-let -- bounded retry counter to prevent unbounded recursive sync
  let consecutiveFailures = 0
  const MAX_CONSECUTIVE_FAILURES = 5

  async function triggerSync(reloadConfig: boolean) {
    if (syncing) {
      pendingReloadConfig = pendingReloadConfig === true || reloadConfig
      return
    }
    syncing = true
    callbacks.onStatusChange('syncing')
    // oxlint-disable-next-line functional/no-let -- tracks whether this sync included a config reload
    let didReloadConfig = false
    const previousConfig = config
    try {
      if (reloadConfig) {
        const [configErr, newConfig] = await loadConfig(paths.repoRoot)
        if (configErr) {
          callbacks.onStatusChange('error')
          callbacks.onError(`Config reload failed: ${configErr.message}`)
          return
        }
        config = newConfig
        didReloadConfig = true
        if (openapiCache) {
          openapiCache.clear()
        }
      }
      const result = await sync(config, { paths, quiet: true, openapiCache })
      if (result.error) {
        callbacks.onStatusChange('error')
        callbacks.onError(`Sync error: ${result.error}`)
        return
      }
      consecutiveFailures = 0
      callbacks.onSyncComplete(result)
      // Only restart the dev server when restart-relevant fields changed.
      // Sidebar/nav changes are picked up by Rspress via _meta.json/_nav.json HMR.
      if (didReloadConfig && onConfigReload && needsServerRestart(previousConfig, config)) {
        callbacks.onStatusChange('restarting')
        await onConfigReload(config)
        callbacks.onConfigReloaded()
      }
      callbacks.onStatusChange('idle')
    } catch (error) {
      consecutiveFailures += 1
      callbacks.onStatusChange('error')
      callbacks.onError(`Sync error: ${toError(error).message}`)
    } finally {
      syncing = false
      if (pendingReloadConfig !== null) {
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          callbacks.onStatusChange('error')
          callbacks.onError(
            `Sync failed ${consecutiveFailures} consecutive times, dropping pending resync. Will retry on next file change.`
          )
          pendingReloadConfig = null
          consecutiveFailures = 0
        } else {
          const shouldReload = pendingReloadConfig
          pendingReloadConfig = null
          // Intentionally not awaited — queues the next sync cycle without
          // blocking the finally block. Errors are caught by triggerSync's own try/catch.
          triggerSync(shouldReload)
        }
      }
    }
  }

  const debouncedSync = debounce(() => triggerSync(false), 150)
  const debouncedConfigSync = debounce(() => triggerSync(true), 150)

  function isConfigFile(filename: string, filePath: string): boolean {
    if (!configFileNames.has(filename)) {
      return false
    }
    // Only treat config files at the repo root as actual config changes,
    // not nested files (e.g. test fixtures) with the same basename.
    const dir = path.dirname(filePath)
    return dir === '.'
  }

  // Native recursive watcher — single FSEvents subscription on macOS,
  // single inotify recursive watch on Linux (Node 22+).
  // Note: fs.watch does NOT follow symlinks — symlinked doc directories
  // will not trigger change events (unlike the previous chokidar watcher).
  // _event ('rename' | 'change') is intentionally discarded — all changes
  // trigger the same debounced re-sync regardless of event type.
  const watcher = watch(repoRoot, { recursive: true }, (_event, filename) => {
    if (!filename) {
      return
    }

    if (isIgnored(filename)) {
      return
    }

    const basename = path.basename(filename)

    if (isConfigFile(basename, filename)) {
      callbacks.onFileChange(basename)
      debouncedConfigSync()
      return
    }

    if (!isMarkdownFile(filename)) {
      return
    }

    callbacks.onFileChange(filename)
    debouncedSync()
  })

  return {
    close() {
      debouncedSync.cancel()
      debouncedConfigSync.cancel()
      watcher.close()
    },
    resync() {
      triggerSync(false)
    },
  }
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check whether a file path has a markdown extension.
 *
 * @private
 * @param filePath - File path to check
 * @returns True if the path ends with a markdown extension
 */
function isMarkdownFile(filePath: string): boolean {
  return MARKDOWN_EXTENSIONS.some((ext) => filePath.endsWith(ext))
}

/**
 * Check whether any path segment is in the ignored directory set.
 *
 * @private
 * @param filePath - File path to check for ignored segments
 * @returns True if any segment matches an ignored directory name
 */
function isIgnored(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => IGNORED_DIRS.has(segment))
}

/**
 * Check whether a config change requires a full dev server restart.
 *
 * Sidebar/nav structure changes are handled by Rspress HMR via `_meta.json`
 * and `_nav.json` files. Only changes to fields that affect `source.define`,
 * theme CSS, or other Rsbuild-level config require a restart.
 *
 * @private
 * @param prev - Previous zpress config
 * @param next - New zpress config after reload
 * @returns True if the server must restart
 */
function needsServerRestart(prev: ZpressConfig, next: ZpressConfig): boolean {
  return restartRelevantHash(prev) !== restartRelevantHash(next)
}

/**
 * Hash the config fields that require a server restart when changed.
 *
 * Excludes `sections` and `nav` since those only affect sidebar/nav
 * structure handled by `_meta.json`/`_nav.json` HMR.
 *
 * Includes `apps`, `packages`, `workspaces`, `features`, and `actions`
 * because they feed into the generated home page (`index.md`) hero,
 * feature cards, and workspace cards via `themeConfig.home`.
 *
 * @private
 * @param config - Zpress config to hash
 * @returns SHA-256 hex digest of restart-relevant fields
 */
function restartRelevantHash(config: ZpressConfig): string {
  const relevant = {
    title: config.title,
    description: config.description,
    tagline: config.tagline,
    icon: config.icon,
    theme: config.theme,
    sidebar: config.sidebar,
    socialLinks: config.socialLinks,
    footer: config.footer,
    home: config.home,
    openapi: config.openapi,
    actions: config.actions,
    features: config.features,
    apps: config.apps,
    packages: config.packages,
    workspaces: config.workspaces,
  }
  return createHash('sha256').update(JSON.stringify(relevant)).digest('hex')
}
