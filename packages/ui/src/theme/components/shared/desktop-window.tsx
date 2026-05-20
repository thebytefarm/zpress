import { CodeBlockRuntime } from '@rspress/core/theme'
import { match, P } from 'massaman/match'
import type React from 'react'

import './desktop-window.css'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface WindowTab {
  /**
   * Tab label text.
   */
  readonly name: string
  /**
   * Whether this tab is the active/selected tab.
   */
  readonly active?: boolean
}

// ---------------------------------------------------------------------------
// DesktopWindow — base window chrome
// ---------------------------------------------------------------------------

export interface DesktopWindowProps {
  /**
   * Optional title text displayed in the title bar (12px mono, muted by default).
   */
  readonly title?: string
  /**
   * Optional tabs rendered in the title bar after the dots.
   */
  readonly tabs?: readonly WindowTab[]
  /**
   * Optional CSS class name for the window variant (e.g. `zp-window--browser`).
   */
  readonly variant?: string
  /**
   * Content rendered inside the window body.
   */
  readonly children: React.ReactNode
}

/**
 * Base macOS-style window chrome with traffic-light dots.
 * All other window components (BrowserWindow, IDEWindow, TerminalWindow)
 * compose this component.
 *
 * @param props - Window configuration
 * @returns React element with desktop window chrome
 */
export function DesktopWindow({
  title,
  tabs,
  variant,
  children,
}: DesktopWindowProps): React.ReactElement | null {
  if (import.meta.env.SSG_MD) {
    return null
  }

  const className = match(variant)
    .with(P.nonNullable, (v) => `zp-window ${v}`)
    .otherwise(() => 'zp-window')

  const titlebarCenter = match(tabs)
    .with(P.nonNullable, (t) => (
      <div className="zp-window__tabs">
        {t.map((tab) => {
          const tabClass = match(tab.active)
            .with(true, () => 'zp-window__tab zp-window__tab--active')
            .otherwise(() => 'zp-window__tab')

          return (
            <span key={tab.name} className={tabClass}>
              <span className="zp-window__tab-dot" />
              {tab.name}
            </span>
          )
        })}
      </div>
    ))
    .otherwise(() =>
      match(title)
        .with(P.nonNullable, (t) => <span className="zp-window__title">{t}</span>)
        .otherwise(() => null)
    )

  return (
    <div className={className}>
      <div className="zp-window__titlebar">
        <div className="zp-window__dots">
          <span className="zp-window__dot zp-window__dot--close" />
          <span className="zp-window__dot zp-window__dot--minimize" />
          <span className="zp-window__dot zp-window__dot--maximize" />
        </div>
        {titlebarCenter}
      </div>
      <div className="zp-window__content">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BrowserWindow
// ---------------------------------------------------------------------------

export interface BrowserTab {
  /**
   * Tab label text.
   */
  readonly title: string
  /**
   * Optional icon rendered before the title.
   */
  readonly icon?: React.ReactNode
}

export interface BrowserWindowProps {
  /**
   * URL displayed in the address bar.
   */
  readonly url?: string
  /**
   * Optional tab rendered in the title bar with icon + title.
   */
  readonly tab?: BrowserTab
  /**
   * Optional tabs rendered in the title bar (passed through to DesktopWindow).
   */
  readonly tabs?: readonly WindowTab[]
  /**
   * Image source rendered as content when no children are provided.
   */
  readonly image?: string
  /**
   * Content rendered inside the window body. Takes priority over `image`.
   */
  readonly children?: React.ReactNode
}

/**
 * Browser-style window with traffic-light dots, a configurable tab,
 * and a Chrome-style URL bar with navigation controls.
 *
 * When `children` are provided they are rendered as the body content.
 * Otherwise, if `image` is provided it is rendered as a full-width image.
 *
 * @param props - Props with optional URL, tab, tabs, image, and children
 * @returns React element with browser window chrome
 */
export function BrowserWindow({
  url,
  tab,
  tabs,
  image,
  children,
}: BrowserWindowProps): React.ReactElement | null {
  if (import.meta.env.SSG_MD) {
    const title = match(tab)
      .with(P.nonNullable, (t) => t.title)
      .otherwise(() => 'Browser')
    const urlLine = match(url)
      .with(P.nonNullable, (u) => `\n\n${u}`)
      .otherwise(() => '')
    const header = `**${title}**${urlLine}`
    return match(children)
      .with(P.nonNullable, (c) => (
        <>
          {header}
          {c}
        </>
      ))
      .otherwise(() => <>{header}</>)
  }

  const body = match({ children, image })
    .with({ children: P.nonNullable }, ({ children: c }) => (
      <div className="zp-window__content">{c}</div>
    ))
    .with({ image: P.nonNullable }, ({ image: src }) => (
      <div className="zp-window__content">
        <img
          src={src}
          alt={match(tab)
            .with(P.nonNullable, (t) => t.title)
            .otherwise(() => '')}
        />
      </div>
    ))
    .otherwise(() => null)

  const titlebarTabs = match(tabs)
    .with(P.nonNullable, (t) => (
      <div className="zp-window__tabs">
        {t.map((windowTab) => {
          const tabClass = match(windowTab.active)
            .with(true, () => 'zp-window__tab zp-window__tab--active')
            .otherwise(() => 'zp-window__tab')

          return (
            <span key={windowTab.name} className={tabClass}>
              <span className="zp-window__tab-dot" />
              {windowTab.name}
            </span>
          )
        })}
      </div>
    ))
    .otherwise(() => null)

  return (
    <div className="zp-window zp-window--browser">
      <div className="zp-window__titlebar">
        <div className="zp-window__dots">
          <span className="zp-window__dot zp-window__dot--close" />
          <span className="zp-window__dot zp-window__dot--minimize" />
          <span className="zp-window__dot zp-window__dot--maximize" />
        </div>
        {match(tab)
          .with(P.nonNullable, (t) => (
            <div className="zp-browser__tab">
              {match(t.icon)
                .with(P.nonNullable, (icon) => <span className="zp-browser__tab-icon">{icon}</span>)
                .otherwise(() => null)}
              <span className="zp-browser__tab-title">{t.title}</span>
            </div>
          ))
          .otherwise(() => null)}
        {titlebarTabs}
      </div>
      {match(url)
        .with(P.nonNullable, (u) => (
          <div className="zp-browser__url-bar">
            <BrowserNavButtons />
            <span className="zp-browser__url">{u}</span>
            <BrowserMenuButton />
          </div>
        ))
        .otherwise(() => null)}
      {body}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Browser chrome sub-components
// ---------------------------------------------------------------------------

/**
 * Back, forward, and refresh navigation buttons for the browser URL bar.
 *
 * @private
 * @returns SVG icon group
 */
function BrowserNavButtons(): React.ReactElement {
  return (
    <div className="zp-browser__nav">
      <svg className="zp-browser__nav-icon" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M10.5 3L5.5 8l5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="zp-browser__nav-icon" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M5.5 3L10.5 8l-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="zp-browser__nav-icon" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M13 8A5 5 0 113 8a5 5 0 0110 0z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M8 3v2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}

/**
 * Vertical three-dot menu button for the browser URL bar.
 *
 * @private
 * @returns SVG icon
 */
function BrowserMenuButton(): React.ReactElement {
  return (
    <svg className="zp-browser__menu-icon" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="8" cy="13" r="1.2" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// IDEWindow
// ---------------------------------------------------------------------------

export interface IDEFileTab {
  /**
   * Filename displayed in the tab.
   */
  readonly name: string
  /**
   * Whether this tab is the active/selected tab.
   */
  readonly active?: boolean
}

export interface IDEWindowProps {
  /**
   * File tabs displayed in the title bar. At least one should be `active`.
   */
  readonly files: readonly IDEFileTab[]
  /**
   * Raw code string to display. Define as an `export const` in MDX to preserve indentation.
   */
  readonly code?: string
  /**
   * Language identifier for the code block (e.g. `'ts'`, `'json'`). Only used with `code`.
   */
  readonly lang?: string
  /**
   * Content rendered inside the window body. Ignored when `code` is provided.
   */
  readonly children?: React.ReactNode
}

/**
 * IDE-style window with file tabs in the title bar.
 * When using `code`, define it as an `export const` in MDX — inline template
 * literals in JSX attributes are dedented by the MDX compiler.
 *
 * @param props - Props with file tabs and code or children
 * @returns React element with IDE window chrome
 */
export function IDEWindow({
  files,
  code,
  lang,
  children,
}: IDEWindowProps): React.ReactElement | null {
  if (import.meta.env.SSG_MD) {
    const activeFile = files.find((f) => f.active)
    const filename = match(activeFile)
      .with(P.nonNullable, (f) => f.name)
      .otherwise(() =>
        match(files[0])
          .with(P.nonNullable, (f) => f.name)
          .otherwise(() => '')
      )
    const langId = lang ?? 'text'
    const header = `**${filename}**\n\n`
    const codeBlock = match(code)
      .with(P.nonNullable, (c) => `${header}\`\`\`${langId}\n${c}\n\`\`\``)
      .otherwise(() =>
        match(children)
          .with(P.nonNullable, () => header)
          .otherwise(() => null)
      )
    return match(codeBlock)
      .with(P.nonNullable, (md) => <>{md}</>)
      .otherwise(() => null)
  }

  const tabs = files.map((file) => ({ name: file.name, active: file.active }))

  const body = match(code)
    .with(P.nonNullable, (c) => (
      <div className="zp-window__code">
        <CodeBlockRuntime
          lang={match(lang)
            .with(P.nonNullable, (l) => l)
            .otherwise(() => 'text')}
          code={c}
        />
      </div>
    ))
    .otherwise(() => children)

  return (
    <DesktopWindow variant="zp-window--ide" tabs={tabs}>
      {body}
    </DesktopWindow>
  )
}

// ---------------------------------------------------------------------------
// TerminalWindow
// ---------------------------------------------------------------------------

export type TerminalColor =
  | 'red'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'cyan'
  | 'magenta'
  | 'white'
  | 'gray'
  | 'success'
  | 'error'
  | 'warn'
  | 'info'
  | 'muted'
  | 'bar'
  | 'step'

export interface TerminalLineConfig {
  /**
   * The text content of this line.
   */
  readonly text: string
  /**
   * Whether this is a command (prefixed with `$`) or output. Defaults to `'output'`.
   */
  readonly type?: 'command' | 'output'
}

export interface TerminalWindowProps {
  /**
   * Optional title displayed in the center of the title bar (e.g. `"zsh"`, `"bash"`).
   */
  readonly title?: string
  /**
   * Lines to render in the terminal.
   */
  readonly children: React.ReactNode
}

/**
 * Terminal-style window with dark background and monospace text.
 * Use `<Command>` and `<Output>` children to compose the terminal content,
 * or use `<Line>` for colored inline text.
 *
 * @param props - Props with optional title and children
 * @returns React element with terminal window chrome
 */
export function TerminalWindow({ title, children }: TerminalWindowProps): React.ReactElement {
  if (import.meta.env.SSG_MD) {
    return <>{children}</>
  }

  return (
    <DesktopWindow variant="zp-window--terminal" title={title ?? 'Terminal'}>
      {children}
    </DesktopWindow>
  )
}

// ---------------------------------------------------------------------------
// Terminal child components
// ---------------------------------------------------------------------------

export interface CommandProps {
  /**
   * The command text (rendered after a `$` prompt).
   */
  readonly children: React.ReactNode
}

/**
 * A terminal command line prefixed with `$`.
 *
 * @param props - Props with command text
 * @returns React element for a terminal command line
 */
export function Command({ children }: CommandProps): React.ReactElement {
  if (import.meta.env.SSG_MD) {
    return <>{`$ ${String(children)}\n`}</>
  }

  return <span className="zp-term-line zp-term-line--command">{children}</span>
}

export interface OutputProps {
  /**
   * The output text.
   */
  readonly children: React.ReactNode
}

/**
 * Terminal output text (no prompt prefix).
 *
 * @param props - Props with output text
 * @returns React element for terminal output
 */
export function Output({ children }: OutputProps): React.ReactElement {
  if (import.meta.env.SSG_MD) {
    return <>{`${String(children)}\n`}</>
  }

  return <span className="zp-term-line zp-term-line--output">{children}</span>
}

export interface LineProps {
  /**
   * Text color. Accepts terminal colors or semantic colors.
   */
  readonly color?: TerminalColor
  /**
   * Whether the text is bold.
   */
  readonly bold?: boolean
  /**
   * Whether the text is dimmed.
   */
  readonly dim?: boolean
  /**
   * The text content.
   */
  readonly children: React.ReactNode
}

/**
 * Inline colored text for terminal output formatting.
 * Combine multiple `<Line>` elements within `<Output>` for rich formatting.
 *
 * @param props - Props with color, bold, dim, and text content
 * @returns React element with colored terminal text
 */
export function Line({ color, bold, dim, children }: LineProps): React.ReactElement {
  if (import.meta.env.SSG_MD) {
    return <>{String(children)}</>
  }

  const classes = [
    match(color)
      .with(P.nonNullable, (c) => `zp-term-text--${c}`)
      .otherwise(() => ''),
    match(bold)
      .with(true, () => 'zp-term-text--bold')
      .otherwise(() => ''),
    match(dim)
      .with(true, () => 'zp-term-text--dim')
      .otherwise(() => ''),
  ]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}
