import type React from 'react'

import './page-rail.css'

export interface PageRailProps {
  readonly children: React.ReactNode
}

/**
 * PageRail — bounded max-width rail with continuous vertical hairlines on
 * each outer edge. Wraps the entire home/landing surface so every section
 * inside reads as a stack of compartments. Mirrors the mockup landing.
 *
 * @param props - Children to render inside the rail.
 * @returns React element.
 */
export function PageRail(props: PageRailProps): React.ReactElement {
  return <div className="zp-page-rail">{props.children}</div>
}
