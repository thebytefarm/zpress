---
'@zpress/kit': patch
'@zpress/cli': patch
'@zpress/config': patch
'@zpress/ui': patch
'@zpress/theme': patch
'@zpress/templates': patch
---

Post-rc.0 fixes ahead of the next pre-release tag.

**@zpress/ui**

- Restored the theme-aware `<ZpressLogo />` SVG in the navbar. Root cause:
  webpack's CJS-flavored resolver couldn't load `@zpress/kit` / `@zpress/ui`
  because their `.` exports only declared `import` — the client bundle was
  crashing entirely, so the `NavLogo` portal never hydrated. Aliased both
  via `import.meta.resolve` in `createRspressConfig`.
- Single-variant themes now hide the appearance toggle. The CSS rule was
  inside `@layer zpress.overrides` and was losing to Rspress's unlayered
  defaults; hoisted it out of the layer.
- Feature card grids inside MDX doc pages no longer pick up the home-page
  section's 32px horizontal padding, so cards align with body prose.
- New: `pageType: 'blank'` frontmatter now suppresses the site footer
  (Rspress already skipped the navbar). Blank pages are fully chromeless —
  use for marketing landings inside a docs deployment.

**Repo**

- Deleted `@zpress/core` and redistributed its sync engine into
  `@zpress/cli/lib` and its config loader into `@zpress/config/loader`.
  The package is no longer published. Imports must move accordingly:
  - `import { loadConfig } from '@zpress/core'` → `from '@zpress/config/loader'`
  - sync engine internals are no longer a public surface.
- Swapped `ts-pattern` + `es-toolkit` direct usage for `massaman/match` and
  `massaman/*` subpaths across all packages.
