import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { Server } from 'node:http'
import { platform } from 'node:os'

import { dev, build, serve } from '@rspress/core'
import type { Paths, ThemeVariant, ZpressConfig } from '@zpress/core'
import { createRspressConfig } from '@zpress/ui'
import getPort, { portNumbers } from 'get-port'
import { match } from 'ts-pattern'

import { toError } from './error'

/**
 * Default port for the dev server.
 * Falls back to the next available port in range DEV_PORT..DEV_PORT + DEV_PORT_RANGE.
 */
export const DEV_PORT = 6174
const DEV_PORT_RANGE = 5

/** Default port for the static preview server. Errors if occupied. */
export const SERVE_PORT = 8080

interface ServerOptions {
  readonly config: ZpressConfig
  readonly paths: Paths
  readonly port?: number
  readonly vscode?: boolean
  readonly theme?: string
  readonly colorMode?: ThemeVariant
}

/**
 * Server instance returned by Rspress dev().
 *
 * Rspress only declares `close()` in its public types, but the
 * underlying Rsbuild server exposes `httpServer` at runtime.
 * We access it via {@link getHttpServer} to avoid a type mismatch.
 */
interface ServerInstance {
  readonly close: () => Promise<void>
}

/**
 * Internal options for `startServer` that control rebuild behaviour.
 */
interface StartServerOptions {
  /**
   * When true, disables the persistent build cache for this invocation.
   */
  readonly skipBuildCache: boolean
}

/**
 * Callback invoked when the dev server should restart due to config changes.
 */
export type OnConfigReload = (newConfig: ZpressConfig) => Promise<void>

/**
 * Result returned by `startDevServer` containing the reload callback and resolved port.
 */
export interface DevServerResult {
  readonly onConfigReload: OnConfigReload
  readonly port: number
  readonly close: () => Promise<void>
}

/**
 * Start the Rspress dev server with zpress configuration.
 *
 * Returns the resolved port and a callback that will restart the server when
 * invoked with updated config. The callback closes the current server instance
 * and starts a new one with the fresh configuration values.
 *
 * @param options - Dev server configuration including config and paths
 * @returns The resolved port and an async reload callback
 */
export async function startDevServer(options: ServerOptions): Promise<DevServerResult> {
  const { paths } = options
  // Resolve port once so restarts reuse the same port
  const preferred = options.port ?? DEV_PORT
  const port = await getPort({ port: portNumbers(preferred, preferred + DEV_PORT_RANGE) })
  // oxlint-disable-next-line functional/no-let -- mutable server instance for restart capability
  let serverInstance: ServerInstance | null = null

  async function startServer(
    config: ZpressConfig,
    internalOptions: StartServerOptions
  ): Promise<boolean> {
    const rspressConfig = createRspressConfig({
      config,
      paths,
      logLevel: 'silent',
      vscode: options.vscode,
      themeOverride: options.theme,
      variantOverride: options.colorMode,
    })
    try {
      serverInstance = await dev({
        appDirectory: paths.repoRoot,
        docDirectory: paths.contentDir,
        config: rspressConfig,
        configFilePath: '',
        extraBuilderConfig: {
          server: {
            port,
            strictPort: true,
          },
          dev: {
            // Suppress Rsbuild's progress bar — zpress TUI renders its own status
            progressBar: false,
          },
          // Disable persistent build cache on config-reload restarts.
          // Rspress's cacheDigest only covers sidebar/nav structure,
          // so changes to title, theme, colors, source.define values
          // etc. would serve stale cached output without this.
          ...buildCacheOverride(internalOptions),
        },
      })
      return true
    } catch (error) {
      process.stderr.write(`Dev server error: ${toError(error).message}\n`)
      return false
    }
  }

  // Start initial server — exit if it fails on first boot
  const started = await startServer(options.config, { skipBuildCache: false })
  if (!started) {
    process.exit(1)
  }

  // Return resolved port and callback that restarts server with new config
  async function handleConfigReload(newConfig: ZpressConfig): Promise<void> {
    process.stdout.write('\n🔄 Config changed — restarting dev server...\n')

    // Close existing server and wait for port release
    if (serverInstance) {
      const httpServer = getHttpServer(serverInstance)
      // Register the close listener before close() so we don't miss the
      // event (once() only observes future emissions)
      const closeEvent = createCloseEvent(httpServer)
      try {
        await serverInstance.close()
      } catch (error) {
        process.stderr.write(`Error closing server: ${toError(error).message}\n`)
      }
      // Rsbuild's close() destroys tracked sockets and calls httpServer.close(),
      // but the 'close' event fires only once the port is actually freed.
      if (closeEvent) {
        const PORT_RELEASE_TIMEOUT = 5_000
        await Promise.race([
          closeEvent,
          // oxlint-disable-next-line no-promise-executor-return -- timeout resolve is intentional
          new Promise((resolve) => setTimeout(resolve, PORT_RELEASE_TIMEOUT)),
        ])
      }
      serverInstance = null

      // Rspack's file-based storage layer (rspack_storage) holds a transaction
      // lock on .temp/ inside the cache directory. Rsbuild's close() resolves
      // before that lock is fully released. Without this settle window the new
      // dev() call panics with "Transaction already in progress".
      const RSPACK_SETTLE_MS = 500
      // oxlint-disable-next-line no-promise-executor-return -- settle delay is intentional
      await new Promise((resolve) => setTimeout(resolve, RSPACK_SETTLE_MS))
    }

    // Start new server with fresh config (bypass persistent cache)
    const restarted = await startServer(newConfig, { skipBuildCache: true })
    if (restarted) {
      process.stdout.write('✅ Dev server restarted\n\n')
    } else {
      process.stderr.write('⚠️  Dev server failed to restart — fix the config and save again\n\n')
    }
  }

  async function closeServer(): Promise<void> {
    if (serverInstance) {
      try {
        await serverInstance.close()
      } catch {
        // Server may already be closed — ignore
      }
      serverInstance = null
    }
  }

  return { onConfigReload: handleConfigReload, port, close: closeServer }
}

/**
 * Build the Rspress site with zpress configuration.
 *
 * @param options - Build configuration including config and paths
 * @returns A promise that resolves when the build completes
 */
export async function buildSite(options: ServerOptions): Promise<void> {
  const rspressConfig = createRspressConfig({ config: options.config, paths: options.paths })
  await build({
    docDirectory: options.paths.contentDir,
    config: rspressConfig,
    configFilePath: '',
  })
}

/**
 * Build the Rspress site for check/validation purposes.
 *
 * Uses the standard Rspress build (no log-level suppression) so that
 * `remarkLink`'s deadlink diagnostics are written to stderr and can be
 * captured by the calling code. The caller is responsible for swallowing
 * stderr output so it doesn't reach the terminal.
 *
 * @param options - Build configuration including config and paths
 * @returns A promise that resolves when the build completes
 */
export async function buildSiteForCheck(options: ServerOptions): Promise<void> {
  const rspressConfig = createRspressConfig({ config: options.config, paths: options.paths })
  await build({
    docDirectory: options.paths.contentDir,
    config: rspressConfig,
    configFilePath: '',
  })
}

/**
 * Serve the built Rspress site (static preview).
 *
 * @param options - Serve configuration including config and paths
 * @returns The port the server is listening on
 */
export async function serveSite(options: ServerOptions): Promise<number> {
  const rspressConfig = createRspressConfig({
    config: options.config,
    paths: options.paths,
    vscode: options.vscode,
    themeOverride: options.theme,
    variantOverride: options.colorMode,
  })
  const preferredPort = options.port ?? SERVE_PORT
  const port = await getPort({ port: portNumbers(preferredPort, preferredPort + DEV_PORT_RANGE) })
  await serve({
    config: rspressConfig,
    configFilePath: '',
    port,
  })
  return port
}

/**
 * Open a URL in the default browser (cross-platform).
 *
 * @param url - The URL to open in the default browser
 */
export function openBrowser(url: string): void {
  const os = platform()
  const { cmd, args } = match(os)
    .with('darwin', () => ({ cmd: 'open', args: [url] }))
    .with('win32', () => ({ cmd: 'cmd', args: ['/c', 'start', url] }))
    .otherwise(() => ({ cmd: 'xdg-open', args: [url] }))
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

// ---------------------------------------------------------------------------

/**
 * Create a close event promise if the server is actively listening.
 *
 * Must be called before `close()` so the listener is registered
 * before the event fires — `once()` only observes future emissions.
 *
 * @private
 * @param httpServer - The HTTP server to listen on, or null
 * @returns A promise that resolves when 'close' fires, or null if not listening
 */
function createCloseEvent(httpServer: Server | null): Promise<unknown[]> | null {
  if (httpServer === null) {
    return null
  }
  if (!httpServer.listening) {
    return null
  }
  return once(httpServer, 'close')
}

/**
 * Return a performance config override that disables persistent build cache
 * on config-reload restarts.
 *
 * Rspress's persistent cache (`buildCache.cacheDigest`) only tracks sidebar/nav
 * structure. Changes to title, theme, colors, and `source.define` values are
 * invisible to it, causing stale cached output. Disabling the cache on restart
 * forces a fresh Rsbuild compilation with the updated config values.
 *
 * @private
 * @param options - Internal server options
 * @returns Partial Rsbuild config with cache override, or empty object
 */
function buildCacheOverride(options: StartServerOptions): Record<string, unknown> {
  if (options.skipBuildCache) {
    return { performance: { buildCache: false } }
  }
  return {}
}

/**
 * Extract the underlying HTTP server from a Rspress/Rsbuild server instance.
 *
 * Rspress's public `ServerInstance` type only declares `close()`, but the
 * runtime object is a Rsbuild dev server which exposes `httpServer`.
 * This helper performs a runtime property check to safely extract it.
 *
 * @private
 * @param instance - The server instance returned by Rspress dev()
 * @returns The HTTP server if present, otherwise null
 */
function getHttpServer(instance: ServerInstance): Server | null {
  const record = instance as unknown as Record<string, unknown>
  const value = record['httpServer']
  if (value instanceof Server) {
    return value
  }
  return null
}
