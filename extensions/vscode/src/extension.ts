// oxlint-disable no-ternary
import fs from 'node:fs'
import path from 'node:path'

import {
  commands,
  env,
  EventEmitter,
  languages,
  Range,
  RelativePattern,
  ThemeColor,
  ThemeIcon,
  Uri,
  window,
  workspace,
} from 'vscode'
import type { ExtensionContext, TextEditor } from 'vscode'

import { createCodeLensProvider } from './code-lens'
import { createManifestReader } from './manifest'
import { createDevServer } from './server'
import { createSidebar } from './sidebar'
import { createStatusBarItem } from './status-bar'
import { createPreviewPanel } from './webview'

/**
 * TODO: Use @zpress/core config resolution instead of manual file checks.
 * This is a quick hack — should be replaced with proper config loading
 * from the zpress packages once the extension can depend on them.
 */
const CONFIG_FILES = [
  'zpress.config.ts',
  'zpress.config.mts',
  'zpress.config.js',
  'zpress.config.mjs',
  'zpress.config.json',
] as const

function isServerUrl(url: string, baseUrl: string): boolean {
  try {
    const target = new URL(url)
    const base = new URL(baseUrl)
    const basePath = base.pathname.replace(/\/$/, '')

    return (
      target.origin === base.origin &&
      (basePath === '' ||
        target.pathname === basePath ||
        target.pathname.startsWith(`${basePath}/`))
    )
  } catch {
    return false
  }
}

function isZpressProject(workspaceRoot: string): boolean {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename
  return CONFIG_FILES.some((file) => fs.existsSync(path.join(workspaceRoot, file)))
}

/**
 * Activates the zpress VS Code extension when a zpress project is detected.
 */
export function activate(context: ExtensionContext): void {
  const folders = workspace.workspaceFolders
  if (!folders) {
    return
  }
  const workspaceFolder = folders.find((folder) => isZpressProject(folder.uri.fsPath))
  if (!workspaceFolder) {
    return
  }

  const workspaceRoot = workspaceFolder.uri.fsPath

  commands.executeCommand('setContext', 'zpress:isProject', true)
  const outputChannel = window.createOutputChannel('zpress')

  const statusBar = createStatusBarItem((alignment, priority) =>
    window.createStatusBarItem(alignment, priority)
  )

  const manifestReader = createManifestReader({
    workspaceRoot,
    createWatcher: (pattern) => workspace.createFileSystemWatcher(pattern),
    EventEmitter,
    RelativePattern,
  })

  const previewPanel = createPreviewPanel({
    createPanel: (viewType, title, showOptions, options) =>
      window.createWebviewPanel(viewType, title, showOptions, options),
    asExternalUri: (uri) => env.asExternalUri(uri),
    parseUri: (value) => Uri.parse(value),
    iconPath: Uri.joinPath(context.extensionUri, 'resources', 'icon.svg'),
    EventEmitter,
    onError: (message) => {
      outputChannel.appendLine(`[zpress] ${message}`)
    },
    onStart: () => {
      commands.executeCommand('zpress.start')
    },
  })

  const sidebar = createSidebar({
    workspaceRoot,
    createWatcher: (pattern) => workspace.createFileSystemWatcher(pattern),
    EventEmitter,
    ThemeIcon,
    ThemeColor,
    RelativePattern,
  })

  /* Empty tree view shown while the dev server is starting */
  const loadingView = window.createTreeView('zpress.loading', {
    treeDataProvider: { getTreeItem: () => ({ label: '' }), getChildren: () => [] },
  })

  /* Server panel — shows status, start/stop, and open-in-browser as tree items */
  // oxlint-disable-next-line unicorn/prefer-event-target -- VS Code API requires EventEmitter
  const serverEmitter = new EventEmitter<void>()
  const serverTreeView = window.createTreeView('zpress.server', {
    treeDataProvider: {
      onDidChangeTreeData: serverEmitter.event,
      getTreeItem: (item: { readonly id: string }) => {
        if (item.id === 'status') {
          const status = server.isRunning() ? 'Running' : 'Stopped'
          const icon = server.isRunning() ? 'circle-large-filled' : 'circle-large-outline'
          const color = server.isRunning() ? 'charts.green' : 'descriptionForeground'
          const port = (() => {
            const baseUrl = server.getBaseUrl()
            if (baseUrl) {
              try {
                return new URL(baseUrl).port
              } catch {
                return null
              }
            }
            return null
          })()
          const description = port ? `port ${port}` : undefined
          return {
            label: status,
            description,
            iconPath: new ThemeIcon(icon, new ThemeColor(color)),
            collapsibleState: 0,
          }
        }
        if (item.id === 'toggle') {
          const label = server.isRunning() ? 'Stop Server' : 'Start Server'
          const icon = server.isRunning() ? 'debug-stop' : 'debug-start'
          const command = server.isRunning() ? 'zpress.stop' : 'zpress.start'
          return {
            label,
            iconPath: new ThemeIcon(icon),
            collapsibleState: 0,
            command: { title: label, command },
          }
        }
        if (item.id === 'restart') {
          return {
            label: 'Restart Server',
            iconPath: new ThemeIcon('debug-restart'),
            collapsibleState: 0,
            command: { title: 'Restart Server', command: 'zpress.restart' },
          }
        }
        if (item.id === 'browser') {
          return {
            label: 'Open in Browser',
            iconPath: new ThemeIcon('link-external'),
            collapsibleState: 0,
            command: { title: 'Open in Browser', command: 'zpress.openInBrowser' },
          }
        }
        return { label: '' }
      },
      getChildren: () => {
        const items: { readonly id: string }[] = [{ id: 'status' }, { id: 'toggle' }]
        if (server.isRunning()) {
          return [...items, { id: 'restart' }, { id: 'browser' }]
        }
        return items
      },
    },
  })

  const sectionTreeViews = sidebar.sections.map((section) =>
    window.createTreeView(section.viewId, {
      treeDataProvider: section.treeDataProvider,
      showCollapseAll: false,
    })
  )

  /**
   * Reveal the sidebar node matching the given URL path, expanding its
   * parent group and selecting it in the correct section tree view.
   */
  function revealSidebarNode(urlPath: string): void {
    const match = sidebar.findNodeByPath(urlPath)
    if (!match) {
      return
    }
    const treeView = sectionTreeViews[match.sectionIndex]
    if (!treeView) {
      return
    }
    sidebar.refreshSections(match.sectionIndex)
    treeView.reveal(match.node, { select: true, focus: false, expand: true })
  }

  /** Context key names matching the `when` clauses in package.json views */
  const SECTION_CONTEXT_KEYS = ['pages', 'apps', 'packages', 'workspaces'] as const

  function refreshSectionViews(): void {
    // oxlint-disable-next-line no-unused-expressions -- .map() used for side-effect (setting context on each section)
    sidebar.sections.map((section, i) => {
      const contextKey = SECTION_CONTEXT_KEYS[i]
      if (contextKey) {
        commands.executeCommand('setContext', `zpress:section.${contextKey}`, section.hasItems)
      }
      return null
    })
  }

  // oxlint-disable-next-line unicorn/consistent-function-scoping
  function setServerStatus(status: 'stopped' | 'starting' | 'running' | 'stopping'): void {
    commands.executeCommand('setContext', 'zpress:serverReady', status === 'running')
    commands.executeCommand(
      'setContext',
      'zpress:serverStarting',
      status === 'starting' || status === 'stopping'
    )
    commands.executeCommand('setContext', 'zpress:serverStopped', status === 'stopped')
  }

  const server = createDevServer({
    workspaceRoot,
    statusBar,
    outputChannel,
    showErrorMessage: (message) => {
      window.showErrorMessage(message)
    },
    onStatusChange: (status) => {
      setServerStatus(status)
      previewPanel.updateStatus(status)
      serverEmitter.fire()
    },
    onReady: (baseUrl) => {
      manifestReader.reload(baseUrl)
      sidebar.setBaseUrl(baseUrl)
      refreshSectionViews()
      const autoOpen = workspace.getConfiguration('zpress.server').get<boolean>('autoOpen', true)
      if (autoOpen) {
        previewPanel.open(baseUrl)
      }
    },
    onStopped: () => {
      manifestReader.reload(null)
      sidebar.setBaseUrl('')
    },
  })

  /* Update section visibility whenever sidebar.json changes */
  sidebar.onDidReload(refreshSectionViews)

  /* Set initial section visibility from any existing sidebar.json */
  refreshSectionViews()

  /* Set initial server status to stopped */
  setServerStatus('stopped')
  previewPanel.updateStatus('stopped')

  function updateTrackedContext(editor: TextEditor | undefined): void {
    if (!editor) {
      commands.executeCommand('setContext', 'zpress:isTrackedFile', false)
      return
    }
    const isTracked =
      editor.document.languageId === 'markdown' &&
      manifestReader.isTracked(editor.document.uri.fsPath)
    commands.executeCommand('setContext', 'zpress:isTrackedFile', isTracked)
  }

  /* Re-evaluate tracked context whenever the manifest updates */
  manifestReader.onDidChange(() => {
    updateTrackedContext(window.activeTextEditor)
  })

  const codeLensProvider = createCodeLensProvider({
    manifestReader,
    EventEmitter,
    Range,
  })

  async function openSourceFile(urlPath: string): Promise<void> {
    const sourcePath = manifestReader.getSourceByUrlPath(urlPath)
    if (!sourcePath) {
      window.showErrorMessage(`No source file found for path: ${urlPath}`)
      return
    }
    try {
      const doc = await workspace.openTextDocument(Uri.file(sourcePath))
      await window.showTextDocument(doc, { preview: false, preserveFocus: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      window.showErrorMessage(`Failed to open source file: ${message}`)
    }
  }

  function resolveTargetUrl(arg?: string | Uri): string | undefined {
    if (typeof arg === 'string') {
      return arg
    }
    if (arg instanceof Uri) {
      return manifestReader.getUrl(arg.fsPath)
    }
    const activeEditor = window.activeTextEditor
    if (!activeEditor) {
      return undefined
    }
    return manifestReader.getUrl(activeEditor.document.uri.fsPath)
  }

  context.subscriptions.push(
    outputChannel,
    statusBar,
    server,
    manifestReader,
    previewPanel,
    sidebar,
    codeLensProvider,
    loadingView,
    serverTreeView,
    serverEmitter,
    loadingView.onDidChangeVisibility((e) => {
      const autoStart = workspace.getConfiguration('zpress.server').get<boolean>('autoStart', true)
      if (e.visible && autoStart && !server.isRunning()) {
        server.start()
      }
    }),
    previewPanel.onNavigate(revealSidebarNode),
    previewPanel.onEdit((urlPath: string) => openSourceFile(urlPath)),
    ...sectionTreeViews,
    commands.registerCommand('zpress.editSource', (node: { readonly link?: string }) => {
      if (!node || !node.link) {
        return
      }
      openSourceFile(node.link)
    }),
    commands.registerCommand('zpress.start', () => {
      server.start()
    }),
    commands.registerCommand('zpress.stop', () => {
      server.stop()
    }),
    commands.registerCommand('zpress.toggle', () => {
      if (server.isRunning()) {
        server.stop()
      } else {
        server.start()
      }
    }),
    commands.registerCommand('zpress.restart', () => {
      server.restart()
    }),
    commands.registerCommand('zpress.collapseAll', () => {
      // oxlint-disable-next-line no-unused-expressions -- .map() used for side-effect (collapsing all sections)
      sidebar.sections.map((section) => {
        if (section.hasItems) {
          commands.executeCommand(`workbench.actions.treeView.${section.viewId}.collapseAll`)
        }
        return null
      })
    }),
    commands.registerCommand('zpress.openInBrowser', () => {
      const baseUrl = server.getBaseUrl()
      if (!baseUrl) {
        window.showWarningMessage('Dev server is not running.')
        return
      }
      env.openExternal(Uri.parse(baseUrl))
    }),
    commands.registerCommand('zpress.openPage', (url: string) => {
      const baseUrl = server.getBaseUrl()
      if (!baseUrl || !isServerUrl(url, baseUrl)) {
        return
      }
      previewPanel.open(url)
    }),
    commands.registerCommand('zpress.preview', (arg?: string | Uri) => {
      /*
       * When invoked from CodeLens, arg is a string URL.
       * When invoked from editor/title menu, VS Code passes the resource Uri.
       * When invoked from the command palette, arg is undefined.
       */
      const targetUrl = resolveTargetUrl(arg)

      const baseUrl = server.getBaseUrl()
      if (!targetUrl || !baseUrl || !isServerUrl(targetUrl, baseUrl)) {
        window.showWarningMessage('This file is not part of the zpress configuration.')
        return
      }

      previewPanel.open(targetUrl)
    }),
    languages.registerCodeLensProvider({ language: 'markdown', scheme: 'file' }, codeLensProvider),
    window.onDidChangeActiveTextEditor(updateTrackedContext),
    workspace.onDidChangeConfiguration((e) => {
      const affected =
        e.affectsConfiguration('zpress.theme') ||
        e.affectsConfiguration('zpress.theme.mode') ||
        e.affectsConfiguration('zpress.server.port')
      if (affected && server.isRunning()) {
        server.restart()
      }
    })
  )

  updateTrackedContext(window.activeTextEditor)
}

/**
 * Deactivates the zpress VS Code extension.
 */
export function deactivate(): void {}
