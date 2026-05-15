# @zpress/kit

An opinionated documentation framework for monorepos. Just point it at your code.

<span class="zp-badge">

[![CI](https://github.com/joggrdocs/zpress/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/joggrdocs/zpress/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@zpress/kit)](https://www.npmjs.com/package/@zpress/kit)
[![License](https://img.shields.io/github/license/joggrdocs/zpress)](https://github.com/joggrdocs/zpress/blob/main/LICENSE)

</span>

## Features

- **Your docs, your structure** — conforms to your repo, not the other way around.
- **One config, full chrome** — sidebars, nav, footer, edit links, version chip, announcement, and theme from one file.
- **Beautiful themes out of the box** — three built-in themes with full dark-mode support, plus first-class custom themes.
- **Monorepo-first** — built for internal docs with workspace cards, OpenAPI integration, and Liquid template support.

## Install

```bash
npm install @zpress/kit
```

## Usage

### Define your docs

```ts
// zpress.config.ts
import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: 'my-project',
  description: 'Documentation for my-project',
  sections: [
    {
      title: 'Getting Started',
      path: '/getting-started',
      include: 'docs/getting-started/*.md',
    },
    {
      title: 'Guides',
      path: '/guides',
      include: 'docs/guides/*.md',
      icon: 'pixelarticons:book-open',
      sort: 'alpha',
    },
  ],
  theme: { name: 'midnight' },
  site: {
    version: 'v1.0',
    edit: { repo: 'acme/docs', branch: 'main', directory: 'docs' },
    report: { repo: 'acme/docs' },
    topbarCta: { text: 'Get started →', href: '/getting-started' },
  },
})
```

### Run it

```bash
npx zpress dev       # start dev server with hot reload
npx zpress build     # build for production
npx zpress serve     # preview production build
```

## Packages

| Package                                                                | Description                          |
| ---------------------------------------------------------------------- | ------------------------------------ |
| [`@zpress/core`](https://www.npmjs.com/package/@zpress/core)           | Config loading, sync engine, assets  |
| [`@zpress/cli`](https://www.npmjs.com/package/@zpress/cli)             | CLI commands and file watcher        |
| [`@zpress/ui`](https://www.npmjs.com/package/@zpress/ui)               | Rspress plugin, theme, and styles    |
| [`@zpress/theme`](https://www.npmjs.com/package/@zpress/theme)         | Theme factory, tokens, and built-ins |
| [`@zpress/config`](https://www.npmjs.com/package/@zpress/config)       | Config loading + Zod schemas         |
| [`@zpress/templates`](https://www.npmjs.com/package/@zpress/templates) | Liquid template registry             |

## Why `@zpress/kit`?

> [!NOTE]
> Published as `@zpress/kit` because npm's overly aggressive moniker rules block the `zpress` name.

## License

[MIT](https://github.com/joggrdocs/zpress/blob/main/LICENSE) - Joggr, Inc.
