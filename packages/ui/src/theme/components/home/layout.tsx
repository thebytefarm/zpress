import { useFrontmatter } from '@rspress/core/runtime'
import type React from 'react'
import { match } from 'ts-pattern'

import { SiteFooter } from '../footer/site-footer'
import { CTA } from './cta'
import { HomeFeature } from './feature'
import { Hero } from './hero'
import type { HeroAction } from './hero'
import { HeroDemo } from './hero-demo'
import { PageRail } from './page-rail'
import { HomeSplit } from './split'
import { TrustStrip } from './trust-strip'
import { HomeWorkspaces } from './workspaces'

interface HomeLayoutProps {
  readonly beforeHero?: React.ReactNode
  readonly afterHero?: React.ReactNode
  readonly beforeFeatures?: React.ReactNode
  readonly afterFeatures?: React.ReactNode
}

interface FrontmatterHero {
  readonly name?: string
  readonly text?: string
  readonly tagline?: string
  readonly actions?: readonly HeroAction[]
  readonly eyebrow?: string
}

interface FrontmatterTrust {
  readonly lead?: string
  readonly names?: readonly string[]
}

interface FrontmatterCTA {
  readonly title?: string
  readonly subtitle?: string
  readonly actions?: readonly HeroAction[]
}

/**
 * Custom HomeLayout for zpress.
 *
 * Renders the approved mockup landing surface inside a continuous PageRail:
 * Hero → TrustStrip → Features → Workspaces → CTA → SiteFooter. Sections
 * render only when their data is present in frontmatter, so consumers opt
 * in to each band individually.
 *
 * @param props - Slot props (kept for API compatibility with Rspress's HomeLayout).
 * @returns React element with the home page.
 */
export function HomeLayout(props: HomeLayoutProps): React.ReactElement {
  const { frontmatter } = useFrontmatter()
  const fm = frontmatter as Record<string, unknown>

  const hero = fm.hero as FrontmatterHero | undefined
  const trust = fm.trust as FrontmatterTrust | undefined
  const cta = fm.cta as FrontmatterCTA | undefined

  const heroSection = match(hero)
    .with(undefined, () => null)
    .otherwise((h) => (
      <Hero
        eyebrow={h.eyebrow}
        title={renderTitle(h.text ?? h.name ?? '')}
        tagline={h.tagline}
        actions={h.actions}
        demo={<HeroDemo />}
      />
    ))

  const trustSection = match(trust)
    .with(undefined, () => null)
    .otherwise((t) => {
      const names = t.names ?? []
      return match(names.length === 0)
        .with(true, () => null)
        .otherwise(() => <TrustStrip lead={t.lead} names={names} />)
    })

  const ctaSection = match(cta)
    .with(undefined, () => null)
    .otherwise((c) =>
      match(c.title === undefined)
        .with(true, () => null)
        .otherwise(() => <CTA title={c.title ?? ''} subtitle={c.subtitle} actions={c.actions} />)
    )

  return (
    <PageRail>
      {props.beforeHero}
      {heroSection}
      {props.afterHero}
      {trustSection}
      {props.beforeFeatures}
      <HomeFeature />
      {props.afterFeatures}
      <HomeSplit
        eyebrow="Configuration"
        title="One file. Validated. Type-safe."
        body="Define your docs site in zpress.config.ts. Zod validates at boot — no surprises in prod."
        bullets={[
          'Type-safe config with full IntelliSense',
          'Hot-reloads on every save',
          'Composable presets for OpenAPI, blog, changelog',
          'First-class i18n out of the box',
        ]}
        action={{ theme: 'brand', text: 'Read the docs', link: '/getting-started/quick-start' }}
        visual={<ConfigPreview />}
      />
      <HomeWorkspaces />
      {ctaSection}
      <SiteFooter />
    </PageRail>
  )
}

/**
 * ConfigPreview — minimal `defineConfig` code preview shown inside the
 * Split section. Imports come exclusively from `@zpress/kit` so the
 * sample resolves against the published package set.
 *
 * @returns React element.
 */
function ConfigPreview(): React.ReactElement {
  return (
    <pre>
      <span className="tok-kw">import</span> {'{ defineConfig }'}{' '}
      <span className="tok-kw">from</span> <span className="tok-str">'@zpress/kit'</span>
      {'\n\n'}
      <span className="tok-kw">export default</span> <span className="tok-fn">defineConfig</span>
      {'({\n'}
      {'  title: '}
      <span className="tok-str">'Acme Docs'</span>
      {',\n'}
      {'  sections: [\n'}
      {'    { title: '}
      <span className="tok-str">'Guides'</span>
      {', include: '}
      <span className="tok-str">'docs/guides/*.md'</span>
      {' },\n'}
      {'  ],\n'}
      {'  theme: { name: '}
      <span className="tok-str">'midnight'</span>
      {' },\n'}
      {'})'}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Render a hero title with the trailing segment styled as a gradient.
 *
 * Splits the title on its last word break and wraps the tail in
 * `<span className="zp-hero__grad">`. When the title is a single word
 * (or empty), it renders verbatim.
 *
 * @private
 * @param raw - The raw title string from frontmatter.
 * @returns Title fragment with a gradient tail when applicable.
 */
function renderTitle(raw: string): React.ReactNode {
  const trimmed = raw.trim()
  return match(trimmed.length === 0)
    .with(true, () => null)
    .otherwise(() => {
      const words = trimmed.split(/\s+/)
      return match(words.length <= 1)
        .with(true, () => trimmed)
        .otherwise(() => {
          const tailCount = Math.max(1, Math.ceil(words.length / 2))
          const headWords = words.slice(0, words.length - tailCount).join(' ')
          const tailWords = words.slice(words.length - tailCount).join(' ')
          return (
            <>
              {headWords}
              <span className="zp-hero__grad"> {tailWords}</span>
            </>
          )
        })
    })
}
