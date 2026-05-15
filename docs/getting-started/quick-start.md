---
title: Quick Start
description: Install zpress and create your first documentation site in minutes.
---

# Quick Start

## Install

```bash
pnpm add @zpress/kit
```

## Initialize

Run `zpress setup` for an interactive walkthrough, or create a `zpress.config.ts` manually at your repo root:

```ts
import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: 'My Project',
  description: 'Project documentation',
  sections: [
    {
      title: 'Getting Started',
      path: '/getting-started',
      include: 'docs/getting-started/*.md',
    },
  ],
})
```

Add another section to the `sections` array that auto-discovers pages from a directory:

```ts
// inside the sections array
{
  title: 'Guides',
  path: '/guides',
  include: 'docs/guides/*.md',
  icon: 'pixelarticons:book-open',
}
```

Every `.md` file matching the glob becomes a page under `/guides/`.

## Configure the site chrome

Tell zpress about your repo so visitors get a real "Edit this page" link, a version chip in the topbar, and a topbar CTA:

```ts
// zpress.config.ts
export default defineConfig({
  // ...
  site: {
    version: 'v1.0',
    edit: { repo: 'acme/docs', branch: 'main', directory: 'docs' },
    report: { repo: 'acme/docs' },
    topbarCta: { text: 'Get started →', href: '/getting-started' },
  },
})
```

Every field is optional — pieces you don't configure render nothing rather than placeholder content. See the [Configuration reference](/reference/configuration#siteconfig) for the full `site.*` surface (sidebar promo, announcement banner, footer columns, etc.).

## Start the dev server

```bash
zpress dev
```

This copies and processes your source markdown into the `.zpress/content/` build directory, starts a file watcher for live reload, and launches the dev server. Open the URL printed in the terminal to see your site.

## Commands

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `zpress setup`    | Create a starter config and generate SVG assets   |
| `zpress sync`     | Sync source files into `.zpress/content/`         |
| `zpress dev`      | Start the dev server with live reload             |
| `zpress build`    | Build the static site for production              |
| `zpress serve`    | Preview the production build locally              |
| `zpress check`    | Validate config and check for broken links        |
| `zpress draft`    | Scaffold a new documentation file from a template |
| `zpress clean`    | Remove build artifacts, synced content, and cache |
| `zpress dump`     | Print the resolved site structure as JSON         |
| `zpress generate` | Generate banner, logo, and icon SVG assets        |

## Project structure

After running `zpress dev`, the `.zpress/` directory is created:

```
your-repo/
├── docs/                       # Your source markdown
│   ├── intro.md
│   └── guides/
├── zpress.config.ts         # Site configuration
└── .zpress/                 # Generated — add to .gitignore
    ├── content/                # Synced pages
    │   └── .generated/         # sidebar.json, nav.json
    ├── public/                 # Static assets
    ├── dist/                   # Build output
    └── cache/                  # Build cache
```

Add `.zpress/` to your `.gitignore`.

## Next steps

- [Content](/concepts/content) — learn how sections, pages, and navigation work
- [Configuration reference](/reference/configuration) — complete field reference for `zpress.config.ts`
