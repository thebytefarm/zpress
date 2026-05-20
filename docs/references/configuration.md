---
title: Configuration
description: Complete reference for zpress.config.ts fields, entry shapes, and workspace metadata.
---

# Configuration

All configuration lives in `zpress.config.ts` at your repo root. Use `defineConfig` for type safety and autocompletion.

```ts
import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: 'My Docs',
  description: 'Project documentation',
  sections: [{ title: 'Introduction', path: '/intro', include: 'docs/intro/*.md' }],
})
```

Configuration is loaded via [c12](https://github.com/unjs/c12), which supports `.ts`, `.js`, `.mjs`, and `.json` formats.

## Top-level fields

| Field         | Type                  | Default    | Description                                                                                    |
| ------------- | --------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `title`       | `string`              | —          | Site title shown in browser tab and home page                                                  |
| `description` | `string`              | —          | Meta description and home page hero headline                                                   |
| `tagline`     | `string`              | —          | Hero tagline below the headline on the home page                                               |
| `sections`    | `Section[]`           | (required) | Information architecture tree                                                                  |
| `nav`         | `'auto' \| NavItem[]` | `'auto'`   | Top navigation bar                                                                             |
| `theme`       | `ThemeConfig`         | —          | Theme configuration (name, color mode, color overrides)                                        |
| `themes`      | `ZpressThemeInput[]`  | —          | Custom themes registered alongside the built-ins. See [Themes](/concepts/themes#custom-themes) |
| `site`        | `SiteConfig`          | —          | Site chrome — version chip, edit/report links, sidebar promo, topbar CTA, announcement, footer |
| `features`    | `Feature[]`           | —          | Explicit home page feature cards (replaces auto-gen)                                           |
| `actions`     | `HeroAction[]`        | —          | Home page hero call-to-action buttons                                                          |
| `sidebar`     | `SidebarConfig`       | —          | Persistent links above/below the sidebar nav tree                                              |
| `workspaces`  | `WorkspaceCategory[]` | —          | Named groups of workspace items for home/landing pages                                         |
| `openapi`     | `OpenAPIConfig`       | —          | OpenAPI spec integration for interactive API docs                                              |
| `exclude`     | `string[]`            | —          | Glob patterns excluded globally across all sources                                             |
| `home`        | `HomeConfig`          | —          | Home page layout (eyebrow, trust strip, CTA band, grid columns)                                |
| `socialLinks` | `SocialLink[]`        | —          | Social media links displayed in the navigation bar                                             |
| `footer`      | `FooterConfig`        | —          | Footer message, copyright text, and social link visibility                                     |
| `icon`        | `string`              | —          | Path to a custom favicon served from `.zpress/public/`. Defaults to auto-generated `/icon.svg` |

## Entry

Each node in `sections` is a `Section`. What you provide determines what it is:

**Page — single file:**

```ts
{ title: 'Architecture', path: '/architecture', include: 'docs/architecture.md' }
```

**Page — inline content:**

```ts
{ title: 'Overview', path: '/overview', content: '# Overview\nProject overview content.' }
```

**Page — async content generator:**

```ts
{ title: 'Status', path: '/status', content: async () => fetchStatus() }
```

**Section — explicit children:**

```ts
{
  title: 'Guides',
  items: [
    { title: 'Quick Start', path: '/guides/quick-start', include: 'docs/guides/quick-start.md' },
    { title: 'Deployment', path: '/guides/deployment', include: 'docs/guides/deployment.md' },
  ],
}
```

**Section — auto-discovered from glob:**

```ts
{ title: 'Guides', path: '/guides', include: 'docs/guides/*.md' }
```

### Section fields

| Field         | Type                                               | Description                                     |
| ------------- | -------------------------------------------------- | ----------------------------------------------- |
| `title`       | `TitleConfig`                                      | Display name or derived title config            |
| `path`        | `string`                                           | Output URL path                                 |
| `include`     | `string \| string[]`                               | Source file path(s) or glob pattern(s)          |
| `content`     | `string \| (() => string \| Promise<string>)`      | Inline or generated markdown content            |
| `items`       | `Section[]`                                        | Explicit child entries                          |
| `landing`     | `boolean`                                          | Enable/disable landing page generation          |
| `collapsible` | `boolean`                                          | Make sidebar section collapsible                |
| `exclude`     | `string[]`                                         | Exclude globs scoped to this entry              |
| `hidden`      | `boolean`                                          | Hide from sidebar (page still routable)         |
| `frontmatter` | `Frontmatter`                                      | Injected YAML frontmatter                       |
| `sort`        | `'default' \| 'alpha' \| 'filename' \| comparator` | Sort order for discovered children              |
| `recursive`   | `boolean`                                          | Directory-based nesting for recursive globs     |
| `entryFile`   | `string`                                           | Section header filename (default: `"overview"`) |
| `icon`        | `IconConfig`                                       | Icon for cards and landing pages                |
| `card`        | `CardConfig`                                       | Landing page card metadata                      |
| `standalone`  | `boolean`                                          | Separate sidebar namespace (requires `path`)    |

`TitleConfig` is either a plain `string` or `{ from: 'auto' | 'filename' | 'heading' | 'frontmatter', transform?: (text, slug) => string }` for derived titles.

`IconConfig` is either a plain Iconify identifier string (e.g. `'devicon:hono'`) or an object `{ id: string, color: string }` for explicit color control. See [Icon Colors](/reference/icons/colors) for available color values.

The `sort` field accepts `'default'`, `'alpha'`, `'filename'`, or a custom comparator function with the signature `(a: ResolvedPage, b: ResolvedPage) => number` where each `ResolvedPage` has `title`, `link`, and `frontmatter` properties. The `'default'` strategy pins intro files (`introduction`, `intro`, `overview`, `readme`) to the top, then sorts alphabetically. This is the implicit default when `sort` is omitted.

## Workspace

Metadata for a monorepo app or package. Drives home page cards, landing page cards, and introduction content. Workspaces are grouped under `WorkspaceCategory` entries in the top-level `workspaces` array.

```ts
{
  title: 'API',
  icon: { id: 'devicon:hono', color: 'blue' },
  description: 'REST API with typed routes',
  tags: ['hono', 'typescript'],
  path: '/apps/api',
  include: 'docs/*.md',
  sort: 'alpha',
}
```

| Field         | Type                                               | Required | Description                                                     |
| ------------- | -------------------------------------------------- | -------- | --------------------------------------------------------------- |
| `title`       | `TitleConfig`                                      | yes      | Display name or derived title config                            |
| `icon`        | `IconConfig`                                       | no       | Iconify identifier or `{ id: IconId, color: IconColor }` object |
| `description` | `string`                                           | yes      | Short description for cards                                     |
| `tags`        | `string[]`                                         | no       | Technology tags (kebab-case)                                    |
| `badge`       | `{ src: string; alt: string }`                     | no       | Deploy badge image                                              |
| `path`        | `string`                                           | yes      | URL prefix for this workspace's documentation                   |
| `include`     | `string \| string[]`                               | no       | Source file path(s) or glob pattern(s) for content discovery    |
| `sort`        | `'default' \| 'alpha' \| 'filename' \| comparator` | no       | Sort order for discovered content                               |
| `exclude`     | `string[]`                                         | no       | Glob patterns excluded from discovery                           |
| `recursive`   | `boolean`                                          | no       | Directory-based nesting for recursive globs                     |
| `entryFile`   | `string`                                           | no       | Section header filename (default: `"overview"`)                 |
| `frontmatter` | `Frontmatter`                                      | no       | Injected YAML frontmatter for all discovered pages              |
| `items`       | `Section[]`                                        | no       | Explicit child sections                                         |
| `openapi`     | `OpenAPIConfig`                                    | no       | OpenAPI spec integration for this workspace                     |

## WorkspaceCategory

Named groups of workspace items. Each category receives card and landing page treatment on the home page.

```ts
{
  title: 'Integrations',
  description: 'Third-party service connectors',
  icon: 'pixelarticons:integration',
  items: [
    { title: 'Stripe', description: 'Payment processing', path: '/integrations/stripe' },
  ],
}
```

| Field         | Type          | Required | Description                                            |
| ------------- | ------------- | -------- | ------------------------------------------------------ |
| `title`       | `TitleConfig` | yes      | Group display name                                     |
| `description` | `string`      | no       | Short description                                      |
| `icon`        | `string`      | yes      | Iconify identifier                                     |
| `items`       | `Workspace[]` | yes      | Workspace items in this group                          |
| `link`        | `string`      | no       | URL prefix override (defaults to `/${slugify(title)}`) |

## CardConfig

Controls how an entry appears as a card on its parent section's auto-generated landing page.

```ts
{
  icon: { id: 'devicon:hono', color: 'blue' },
  scope: 'apps/',
  description: 'REST API with typed routes',
  tags: ['Hono', 'REST'],
  badge: { src: '/logos/vercel.svg', alt: 'Vercel' },
}
```

| Field         | Type                           | Description                                                     |
| ------------- | ------------------------------ | --------------------------------------------------------------- |
| `icon`        | `IconConfig`                   | Iconify identifier or `{ id: IconId, color: IconColor }` object |
| `scope`       | `string`                       | Scope label above the card name                                 |
| `description` | `string`                       | Short description (overrides auto-extracted)                    |
| `tags`        | `string[]`                     | Technology tag badges                                           |
| `badge`       | `{ src: string; alt: string }` | Deploy badge image                                              |

## NavItem

Explicit navigation bar configuration. Used when `nav` is an array instead of `'auto'`.

```ts
nav: [
  { title: 'Guides', link: '/guides/deploying-to-vercel' },
  { title: 'API', link: '/api/overview' },
]
```

| Field         | Type        | Description                             |
| ------------- | ----------- | --------------------------------------- |
| `title`       | `string`    | Display text                            |
| `link`        | `string`    | Target URL path                         |
| `items`       | `NavItem[]` | Dropdown children                       |
| `activeMatch` | `string`    | Regex pattern for active state matching |

Set `nav: 'auto'` to generate one nav item per non-standalone top-level section.

## Feature

Explicit feature card for the home page. Replaces the auto-generated cards derived from top-level sections.

```ts
features: [
  {
    title: 'Getting Started',
    description: 'Set up zpress and create your first site.',
    link: '/getting-started',
    icon: 'pixelarticons:speed-fast',
  },
]
```

| Field         | Type          | Description                                 |
| ------------- | ------------- | ------------------------------------------- |
| `title`       | `TitleConfig` | Card title (string or derived title config) |
| `description` | `string`      | Short description below title               |
| `link`        | `string`      | Click target URL                            |
| `icon`        | `string`      | Iconify identifier                          |

## OpenAPIConfig

Configuration for OpenAPI spec integration.

| Field           | Type                       | Default           | Description                                              |
| --------------- | -------------------------- | ----------------- | -------------------------------------------------------- |
| `spec`          | `string`                   | (required)        | Path to OpenAPI JSON or YAML file, relative to repo root |
| `path`          | `string`                   | (required)        | URL prefix for API operation pages                       |
| `title`         | `string`                   | `'API Reference'` | Sidebar group title                                      |
| `sidebarLayout` | `'method-path' \| 'title'` | `'method-path'`   | How operations appear in the sidebar                     |

`sidebarLayout` controls how API operations are displayed in the sidebar:

- `'method-path'` — shows `GET /users` with method badge and path in code font
- `'title'` — shows the operation summary (e.g., "List Users")

## HeroAction

A call-to-action button on the home page hero section.

```ts
actions: [
  { theme: 'brand', text: 'Get Started', link: '/getting-started/quick-start' },
  { theme: 'alt', text: 'View on GitHub', link: 'https://github.com/...' },
]
```

| Field   | Type               | Description          |
| ------- | ------------------ | -------------------- |
| `theme` | `'brand' \| 'alt'` | Button style variant |
| `text`  | `string`           | Button label         |
| `link`  | `string`           | Click target URL     |

## SidebarConfig

Persistent links rendered above or below the sidebar navigation tree.

```ts
sidebar: {
  above: [
    { text: 'Home', link: '/', icon: 'pixelarticons:home' },
  ],
  below: [
    { text: 'GitHub', link: 'https://github.com/...', icon: 'pixelarticons:github' },
  ],
}
```

| Field   | Type            | Description                       |
| ------- | --------------- | --------------------------------- |
| `above` | `SidebarLink[]` | Links rendered above the nav tree |
| `below` | `SidebarLink[]` | Links rendered below the nav tree |

Each `SidebarLink` has:

| Field   | Type                                | Required | Description             |
| ------- | ----------------------------------- | -------- | ----------------------- |
| `text`  | `string`                            | yes      | Link display text       |
| `link`  | `string`                            | yes      | Target URL              |
| `icon`  | `IconConfig`                        | no       | Iconify icon identifier |
| `style` | `'brand' \| 'alt' \| 'ghost'`       | no       | Visual style variant    |
| `shape` | `'square' \| 'rounded' \| 'circle'` | no       | Icon shape              |

## HomeConfig

Home page layout — hero eyebrow, trust strip, final CTA band, and card-grid layout for features and workspaces.

```ts
home: {
  eyebrow: '★ open source · v1.0 · MIT',
  features: { columns: 3, truncate: { description: 2 } },
  workspaces: { columns: 2, truncate: { title: 1, description: 2 } },
  trust: {
    lead: 'used by docs at',
    names: ['Acme', 'Globex', 'Initech'],
  },
  cta: {
    title: 'Ship the docs your team deserves.',
    subtitle: 'One CLI. Three minutes. Production-ready.',
    actions: [
      { theme: 'brand', text: 'Get started', link: '/getting-started/quick-start' },
      { theme: 'alt', text: 'Star on GitHub →', link: 'https://github.com/acme/docs' },
    ],
  },
}
```

| Field        | Type              | Description                                                     |
| ------------ | ----------------- | --------------------------------------------------------------- |
| `eyebrow`    | `string`          | Eyebrow chip rendered above the hero title (e.g. version label) |
| `features`   | `HomeGridConfig`  | Layout options for feature cards                                |
| `workspaces` | `HomeGridConfig`  | Layout options for workspace cards                              |
| `trust`      | `HomeTrustConfig` | Trust strip rendered between the hero and the features grid     |
| `cta`        | `HomeCtaConfig`   | Final CTA band rendered just above the footer                   |

Each `HomeGridConfig` has:

| Field      | Type               | Description                                     |
| ---------- | ------------------ | ----------------------------------------------- |
| `columns`  | `1 \| 2 \| 3 \| 4` | Number of grid columns                          |
| `truncate` | `TruncateConfig`   | Max visible lines before clipping with ellipsis |

`TruncateConfig` accepts `title?: number` and `description?: number` for line-clamp values.

`HomeTrustConfig`:

| Field   | Type       | Description                                          |
| ------- | ---------- | ---------------------------------------------------- |
| `lead`  | `string`   | Short lead phrase (e.g. `"used by docs at"`)         |
| `names` | `string[]` | List of names to render (renders nothing when empty) |

`HomeCtaConfig`:

| Field      | Type           | Description                                           |
| ---------- | -------------- | ----------------------------------------------------- |
| `title`    | `string`       | CTA headline                                          |
| `subtitle` | `string`       | Optional supporting text                              |
| `actions`  | `HeroAction[]` | Up to two CTA buttons (same shape as `actions` above) |

## SiteConfig

Site-level chrome — version chip, edit/report links, sidebar promo, topbar CTA, announcement banner, and extended footer. Every field is optional; pieces with no config render nothing.

```ts
site: {
  version: 'v1.0',
  edit:   { repo: 'acme/docs', branch: 'main', directory: 'docs' },
  report: { repo: 'acme/docs' },
  sidebarPromo: {
    title: 'Try Acme Cloud',
    body:  'Hosted Acme in two clicks.',
    cta:   { text: 'Start free', href: 'https://acme.io' },
  },
  topbarCta: { text: 'Get started →', href: '/getting-started' },
  announcement: {
    id: 'v1',
    lead: 'NEW',
    message: 'Acme Docs 1.0 is here.',
    cta: { href: '/changelog', label: 'What changed' },
  },
  footer: {
    columns: [
      { heading: 'Product', links: [{ text: 'Features', href: '/features' }] },
      { heading: 'Community', links: [{ text: 'GitHub', href: 'https://github.com/acme' }] },
    ],
    tagline: 'Built with zpress',
  },
}
```

| Field          | Type                     | Description                                                                 |
| -------------- | ------------------------ | --------------------------------------------------------------------------- |
| `version`      | `string`                 | Version label next to the brand in the topbar (e.g. `'v1.0'`). Omit to hide |
| `edit`         | `SiteEditConfig`         | "Edit this page on GitHub" link rendered under every doc page               |
| `report`       | `SiteReportConfig`       | "Report an issue" link rendered under every doc page                        |
| `sidebarPromo` | `SiteSidebarPromoConfig` | Promo card pinned to the bottom of the docs sidebar                         |
| `topbarCta`    | `SiteCtaConfig`          | Topbar CTA button (also mirrored into the mobile nav)                       |
| `announcement` | `AnnouncementConfig`     | Announcement banner rendered above the topbar                               |
| `footer`       | `SiteFooterConfig`       | Footer columns, tagline, and brand mark                                     |

`SiteEditConfig`:

| Field       | Type     | Description                                                           |
| ----------- | -------- | --------------------------------------------------------------------- |
| `repo`      | `string` | `"org/repo"` shorthand or full URL                                    |
| `branch`    | `string` | Branch to link against (default `"main"`)                             |
| `directory` | `string` | Subdirectory inside the repo containing the docs (default: repo root) |
| `label`     | `string` | Override the visible label (default `"Edit this page on GitHub"`)     |

`SiteReportConfig`:

| Field   | Type     | Description                                              |
| ------- | -------- | -------------------------------------------------------- |
| `repo`  | `string` | `"org/repo"` shorthand or full issues URL                |
| `label` | `string` | Override the visible label (default `"Report an issue"`) |

`SiteSidebarPromoConfig`:

| Field   | Type                             | Description    |
| ------- | -------------------------------- | -------------- |
| `title` | `string`                         | Promo headline |
| `body`  | `string`                         | Body copy      |
| `cta`   | `{ text: string; href: string }` | CTA button     |

`SiteCtaConfig`:

| Field  | Type     | Description  |
| ------ | -------- | ------------ |
| `text` | `string` | Button label |
| `href` | `string` | Click target |

`AnnouncementConfig`:

| Field        | Type                              | Description                                                        |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| `id`         | `string`                          | Stable id — when present, dismissal persists in `localStorage`     |
| `lead`       | `string`                          | Highlighted lead phrase rendered before the message (e.g. `"NEW"`) |
| `message`    | `string`                          | Body text of the announcement                                      |
| `cta`        | `{ href: string; label: string }` | Optional CTA appended after the message                            |
| `persistent` | `boolean`                         | When `true`, hides the dismiss button                              |

`SiteFooterConfig`:

| Field       | Type                 | Description                                                               |
| ----------- | -------------------- | ------------------------------------------------------------------------- |
| `columns`   | `SiteFooterColumn[]` | Link columns rendered in the footer grid. Omit for a minimal footer       |
| `tagline`   | `string`             | Small tagline rendered on the right side of the bottom strip              |
| `brandMark` | `string`             | Brand mark character rendered in the footer's brand block (default `'Z'`) |

`SiteFooterColumn`:

| Field     | Type                               | Description    |
| --------- | ---------------------------------- | -------------- |
| `heading` | `string`                           | Column heading |
| `links`   | `{ text: string; href: string }[]` | Column links   |

> **Security note** — all `href` values inside `site.*` are validated through a safe-URL helper that rejects `javascript:`, `data:`, `vbscript:`, and `file:` schemes. Relative paths, fragment anchors, `http://`, `https://`, `mailto:`, and `tel:` are allowed.

## SocialLink

Social media links displayed in the navigation bar.

```ts
socialLinks: [
  { icon: 'github', mode: 'link', content: 'https://github.com/acme' },
  { icon: 'discord', mode: 'link', content: 'https://discord.gg/acme' },
]
```

| Field     | Type                                 | Required | Description                                          |
| --------- | ------------------------------------ | -------- | ---------------------------------------------------- |
| `icon`    | `SocialLinkIcon \| { svg: string }`  | yes      | Built-in icon name or custom SVG                     |
| `mode`    | `'link' \| 'text' \| 'img' \| 'dom'` | yes      | How the content is rendered                          |
| `content` | `string`                             | yes      | URL, text, image source, or HTML depending on `mode` |

Built-in icon names: `github`, `discord`, `x`, `slack`, `linkedin`, `youtube`, `npm`, `gitlab`, `bluesky`, `facebook`, `instagram`.

## FooterConfig

Footer displayed below all page content.

```ts
footer: {
  message: 'Built with zpress',
  copyright: 'Copyright © 2025 Acme Inc.',
  socials: true,
}
```

| Field       | Type      | Description                                        |
| ----------- | --------- | -------------------------------------------------- |
| `message`   | `string`  | Footer message text                                |
| `copyright` | `string`  | Copyright notice                                   |
| `socials`   | `boolean` | Show social links from `socialLinks` in the footer |
