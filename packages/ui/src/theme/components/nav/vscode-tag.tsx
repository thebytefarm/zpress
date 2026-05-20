import type React from 'react'

import './vscode-tag.css'
import { Icon } from '../shared/icon.tsx'

/**
 * VS Code mode indicator — pill-shaped badge rendered next to the
 * BranchTag when the page is loaded inside the VS Code webview
 * (detected via `?env=vscode` query parameter).
 *
 * @returns React element with the VS Code badge
 */
export function VscodeTag(): React.ReactElement {
  return (
    <span className="zp-vscode-tag" title="VS Code preview mode" aria-label="VS Code preview mode">
      <Icon icon="vscode-icons:file-type-vscode" width={14} height={14} />
      <span className="zp-vscode-tag__text">vscode</span>
    </span>
  )
}
