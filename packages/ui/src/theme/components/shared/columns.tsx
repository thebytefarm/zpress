import { match } from 'massaman/match'
import type React from 'react'

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export interface ColumnsProps {
  /**
   * Number of grid columns (1–4). Defaults to 2.
   * Collapses to a single column on viewports below 640px.
   */
  readonly cols?: 1 | 2 | 3 | 4
  /**
   * Grid children — either raw content or explicit Column wrappers.
   */
  readonly children: React.ReactNode
}

/**
 * Generic responsive grid layout for arbitrary content.
 * Supports 1–4 columns with automatic responsive collapse.
 *
 * @param props - Grid configuration with column count
 * @returns React element with CSS Grid layout
 */
export function Columns({ cols = 2, children }: ColumnsProps): React.ReactElement {
  const className = match(cols)
    .with(1, () => 'zp-columns zp-columns--1')
    .with(2, () => 'zp-columns zp-columns--2')
    .with(3, () => 'zp-columns zp-columns--3')
    .with(4, () => 'zp-columns zp-columns--4')
    .exhaustive()

  return <div className={className}>{children}</div>
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------

export interface ColumnProps {
  /**
   * Content rendered inside the column.
   */
  readonly children: React.ReactNode
}

/**
 * Explicit wrapper for content placed inside a Columns grid.
 * Use when you need to group multiple elements into a single grid cell.
 *
 * @param props - Column content
 * @returns React element for a grid cell
 */
export function Column({ children }: ColumnProps): React.ReactElement {
  return <div className="zp-column">{children}</div>
}
