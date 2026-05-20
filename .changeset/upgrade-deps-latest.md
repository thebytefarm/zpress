---
'@zpress/kit': patch
'@zpress/cli': patch
'@zpress/config': patch
'@zpress/ui': patch
'@zpress/theme': patch
'@zpress/templates': patch
---

Upgrade dependencies to latest across the workspace.

- Catalog: `@rslib/core` ^0.21.5, `@rspress/core` ^2.0.12, `@typescript/native-preview` 7.0.0-dev.20260519.1, `vitest` ^4.1.7, `zod` ^4.4.3
- CLI: `@clack/prompts` ^1.4.0, `@kidd-cli/core` ^0.24.0, `ink` ^7.0.3, `jiti` ^2.7.0, `liquidjs` ^10.27.0
- UI: `katex` ^0.16.47, `openapi-sampler` ^1.7.3, `ts-morph` ^28.0.0, iconify icon sets, React 19.2.6
- Config: `c12` 4.0.0-beta.5, `tsx` ^4.22.3
- Tooling: `oxlint` ^1.66.0, `oxfmt` ^0.51.0, `turbo` ^2.9.14, `@types/node` ^25.9.1, `@types/react` ^19.2.15

`mermaid` stays pinned at ^10.9.5 — v11 uses langium for parsing and breaks Rspress's webpack compilation of global components.
