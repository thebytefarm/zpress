import type { HomeGridConfig } from '@zpress/config'
import { match, P } from 'massaman/match'
import type React from 'react'

import { useZpress } from '../../hooks/use-zpress'
import type { WorkspaceGroupData } from '../../hooks/use-zpress'
import { WorkspaceCard } from '../workspaces/card'
import { WorkspaceGrid } from '../workspaces/grid'

/**
 * Smart orchestrator that reads workspace data from themeConfig
 * and renders workspace groups with the correct card component per type.
 *
 * @returns React element with workspace groups or null
 */
export function HomeWorkspaces(): React.ReactElement | null {
  const { workspaces, home } = useZpress()
  const gridConfig = home && home.workspaces

  return match(workspaces)
    .with(
      P.when((w): w is readonly WorkspaceGroupData[] => Array.isArray(w) && w.length > 0),
      (groups) => (
        <div className="zp-workspace-section">
          <hr className="zp-divider" />
          {groups.map((group) => renderGroup(group, gridConfig))}
        </div>
      )
    )
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a single workspace group with its cards.
 *
 * @private
 * @param group - Workspace group data with heading, description, and cards
 * @param gridConfig - Optional grid layout config for columns and truncation
 * @returns Workspace grid element
 */
function renderGroup(
  group: WorkspaceGroupData,
  gridConfig: HomeGridConfig | undefined
): React.ReactElement {
  const titleLines = gridConfig && gridConfig.truncate && gridConfig.truncate.title
  const descLines = gridConfig && gridConfig.truncate && gridConfig.truncate.description

  return (
    <WorkspaceGrid
      key={group.heading}
      heading={group.heading}
      description={group.description}
      columns={gridConfig && gridConfig.columns}
    >
      {group.cards.map((card, i) => (
        <WorkspaceCard
          key={`${card.title}-${i}`}
          title={card.title}
          href={card.href}
          icon={card.icon}
          scope={card.scope}
          description={card.description}
          tags={card.tags}
          badge={card.badge}
          titleLines={titleLines}
          descriptionLines={descLines}
        />
      ))}
    </WorkspaceGrid>
  )
}
