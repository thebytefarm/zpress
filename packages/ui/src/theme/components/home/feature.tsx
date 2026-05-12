import { useFrontmatter } from '@rspress/core/runtime'
import type { HomeGridConfig } from '@zpress/config'
import type React from 'react'
import { match, P } from 'ts-pattern'

import { useZpress } from '../../hooks/use-zpress'
import { FeatureCard } from './feature-card'
import type { FeatureItem } from './feature-card'

/**
 * Custom HomeFeature override for zpress.
 * Uses useFrontmatter() hook to read features and renders with FeatureCard/FeatureGrid styling.
 *
 * @returns React element with feature grid or null
 */
export function HomeFeature(): React.ReactElement | null {
  const { frontmatter } = useFrontmatter()
  const { home } = useZpress()
  const gridConfig = home && home.features

  // Rspress types frontmatter as its own FrontMatterMeta shape which does not
  // include zpress-specific `features`. The double cast is necessary because
  // no shared Zod schema exists for frontmatter validation at runtime.
  const features = (frontmatter as Record<string, unknown>).features as
    | readonly FeatureItem[]
    | undefined

  return match(features)
    .with(
      P.when((f): f is readonly FeatureItem[] => Array.isArray(f) && f.length > 0),
      (items) => (
        <div className="zp-feature-section">
          <div className="zp-feature-section-head">
            <div className="zp-feature-section-head__eyebrow">Features</div>
            <h2 className="zp-feature-section-head__title">Built for the way you ship.</h2>
            <p className="zp-feature-section-head__sub">
              Everything you need, nothing you don&apos;t. Configured in TypeScript, validated at
              boot.
            </p>
          </div>
          <div className="zp-feature-grid">
            {items.map((f, i) => renderFeature(f, i, gridConfig))}
          </div>
        </div>
      )
    )
    .otherwise(() => null)
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a single feature as a FeatureCard element.
 * Accepts the array index from `.map()` to guarantee unique keys.
 *
 * @private
 * @param feature - Feature item data
 * @param index - Array index for key generation
 * @param gridConfig - Optional grid config for truncation
 * @returns Feature card element
 */
function renderFeature(
  feature: FeatureItem,
  index: number,
  gridConfig: HomeGridConfig | undefined
): React.ReactElement {
  const titleLines = gridConfig && gridConfig.truncate && gridConfig.truncate.title
  const descLines = gridConfig && gridConfig.truncate && gridConfig.truncate.description

  return (
    <FeatureCard
      key={`${feature.title}-${index}`}
      title={feature.title}
      description={feature.details}
      href={feature.link}
      icon={feature.icon}
      titleLines={titleLines}
      descriptionLines={descLines}
    />
  )
}
