---
'@zpress/kit': major
'@zpress/cli': major
'@zpress/config': major
'@zpress/ui': major
'@zpress/theme': major
'@zpress/templates': major
---

zpress 1.0 — release candidate

This is a major release that locks the v1 public API. Headline changes:

**Theme system**

- Renamed the built-in `base` theme to `default`. The `default` theme now
  ships both `dark` and `light` variants; the sun/moon toggle swaps between
  them.
- Replaced `theme.colorMode` with `theme.variant` (values: `'dark' | 'light'`).
  The `'toggle'` value is no longer supported — themes that declare both
  variants always show the toggle; themes that declare one hide it.
- `defineTheme()` input shape changed from `{ name, tokens, modes, defaultMode }`
  to `{ name, variants: { dark?, light? }, defaultVariant? }`. The factory
  validates the envelope before parsing token trees so error messages now
  point at the offending input field.
- `@zpress/kit`, `@zpress/core`, and `@zpress/config` no longer re-export
  `ColorMode`, `ThemeMode`, `COLOR_MODES`, or `resolveDefaultColorMode`.
  Use `ThemeVariant`, `THEME_VARIANTS`, and `resolveDefaultVariant` from
  `@zpress/theme`. The deprecated aliases remain in `@zpress/theme` itself
  for one-version migration safety.

**Config surface**

- `Frontmatter` is now strict — unknown keys are rejected at config load
  and produce a typed compile-time error. On-disk markdown frontmatter is
  unaffected (gray-matter never typed it as `Frontmatter`).
- Renamed `WorkspaceCategory` → `WorkspaceGroup`. The `config.workspaces`
  field name is unchanged.
- Every field on `ZpressConfig` and its sub-types now has solid JSDoc that
  propagates to IDE hover docs.
- Tightened the CLI `--color-mode` schema from `string` to `enum('dark', 'light')`.

**Dependency hygiene**

- Removed `gray-matter` (last released 2021, drags in the abandoned
  `js-yaml@3` line with known prototype-pollution CVEs). Replaced with a
  ~25-line `parse` / `stringify` helper built on `yaml` (eemeli/yaml).
- Removed unused `js-yaml` and `@types/js-yaml` direct deps from `@zpress/core`.

**Fixes**

- `safe-url.ts` regex now stores its control-character range as Unicode
  escape sequences (`\u0000`–`\u007F`) instead of raw control bytes. Git
  no longer marks the file as binary; editors render it correctly.
- Deleted orphaned `packages/ui/src/head/js/color-mode-{dark,light}.js`.
- Hardened variant resolution across the head IIFE, theme provider, and
  theme switcher with cross-reference comments and a re-entrancy guard
  on the MutationObserver snap-back.

**Migration**

```diff
- import { ColorMode, ThemeMode, COLOR_MODES } from '@zpress/kit'
+ import { ThemeVariant, THEME_VARIANTS } from '@zpress/kit'

  defineConfig({
    theme: {
-     colorMode: 'dark',
+     variant: 'dark',
-     name: 'base',
+     name: 'default',
    },
    themes: [
      defineTheme({
        name: 'sunset',
-       tokens: sunsetTokens,
-       modes: ['dark'],
-       defaultMode: 'dark',
+       variants: { dark: sunsetTokens },
+       defaultVariant: 'dark',
      }),
    ],
-   workspaces: [{ title: 'Integrations', ... } as WorkspaceCategory],
+   workspaces: [{ title: 'Integrations', ... } as WorkspaceGroup],
  })
```
