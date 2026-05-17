# Review focus — uncommitted on `feat/v1`

> Delete pre-push. Scratch doc for review focus only.

19 files touched in this session. The bulk of the v1 overhaul is already in `f76c981` — these are post-overhaul cleanups.

## 1. Lint fixes — TS/TSX (11 files, focused review)

| File                                                                        | Change                                                                                                                                                                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/hooks/use-dev-server.ts`                                  | Renamed inner catch param `error` → `cause` (shadowed outer `useState`); inline-disabled `promise/prefer-await-to-callbacks` + `unicorn/catch-error-name` (useEffect can't be async, outer scope owns `error`) |
| `packages/cli/src/index.ts`                                                 | Inline-disabled `jest/require-hook` on the two top-level `process.on(...)` calls — CLI entry, not a test                                                                                                       |
| `packages/cli/src/lib/crash-reporter.test.ts`                               | `toEqual` → `toStrictEqual` ×2 (already in tree from earlier `--fix`)                                                                                                                                          |
| `packages/ui/src/theme/components/announcement/announcement-bar.tsx`        | Removed trailing bare `return` in `match().otherwise()`                                                                                                                                                        |
| `packages/ui/src/theme/components/ask-ai/ask-ai-button.tsx`                 | Same — bare `return` removed                                                                                                                                                                                   |
| `packages/ui/src/theme/components/content-footer/content-footer-portal.tsx` | `const ensureHost = () => {…}` → `function ensureHost() {…}`; `insertBefore(node, firstChild)` → explicit-null check + `firstChild.before(node)` / `docFooter.append(node)`                                    |
| `packages/ui/src/theme/components/content-footer/feedback.tsx`              | Bare `return` removed                                                                                                                                                                                          |
| `packages/ui/src/theme/components/nav/mobile-nav-cta.tsx`                   | Same func-style fix; flipped `if (socials !== null)` to `if (socials === null)` (no-negated-condition) and used `socials.before(node)`                                                                         |
| `packages/ui/src/theme/components/nav/version-chip.tsx`                     | Braced an `if/return` body (curly rule, oxfmt-applied)                                                                                                                                                         |
| `packages/ui/src/theme/components/sidebar/framework-picker.tsx`             | 3 JSX ternaries → `match(value).with(...).otherwise(...)` from ts-pattern; added the `match` import                                                                                                            |
| `packages/ui/src/theme/components/sidebar/sidebar-toggle.tsx`               | Bare `return`s removed in two `.with()/.otherwise()` callbacks; oxfmt braced a few `if/return` bodies                                                                                                          |

**Behavior:** no runtime changes. Pure lint/style — every change either braces existing control flow, drops a no-op `return`, swaps DOM API for the modern equivalent that produces the same result, or rewrites a ternary to a `match` that resolves to the same JSX.

## 2. Build pipeline fixes (2 files, careful review)

### `packages/config/turbo.json`

Added `"dependsOn": ["^build"]` to the `generate:schema` task.

**Why:** `generate-schema.ts` imports `../src/schema.ts` which transitively imports `@zpress/theme`. With no `dependsOn`, turbo ran `generate:schema` in parallel with `@zpress/theme:build` on cold caches → `ERR_MODULE_NOT_FOUND` on `@zpress/theme/dist/index.mjs`. Cold-cache `pnpm typecheck` (and CI) would intermittently fail.

### `packages/ui/package.json`

Chained `oxfmt --write src/theme/styles/themes src/head/css/themes` between the theme-CSS generator and `minify-head.mjs` in `postbuild`:

```diff
- "postbuild": "node scripts/generate-theme-css.mjs && node scripts/minify-head.mjs",
+ "postbuild": "node scripts/generate-theme-css.mjs && oxfmt --write src/theme/styles/themes src/head/css/themes && node scripts/minify-head.mjs",
```

**Why:** `themeToCss` emits long CSS values on single lines. oxfmt wraps them. Every build rewrote committed CSS to single-line, every `oxfmt --check` failed. Formatting after generation makes the output canonical and idempotent.

## 3. Regenerated CSS — skim only

6 theme files, all mechanical reformat-after-generate output:

- `packages/ui/src/theme/styles/themes/{base,midnight,arcade}.css`
- `packages/ui/src/head/css/themes/{base,midnight,arcade}.css`

Diff is exclusively oxfmt line-wrapping of `--zp-shadow-hero-demo` and `--zp-gradient-hero-title` values. No semantic change.

---

# Theme API — how it works in v1

Verified end-to-end against `@zpress/theme`, `@zpress/config`, `@zpress/ui`, and `zpress.config.ts`.

## Three things a user can do

### A. Pick a built-in theme

```ts
import { defineConfig } from '@zpress/kit'

export default defineConfig({
  theme: {
    name: 'midnight', // 'base' | 'midnight' | 'arcade' (autocompletes built-ins, accepts any string)
    colorMode: 'toggle', // 'dark' | 'light' | 'toggle' — optional, defaults to theme's natural mode
    switcher: true, // show theme dropdown in nav
    colors: { brand: '#…' }, // optional light-mode overrides
    darkColors: { brand: '#…' }, // optional dark-mode overrides
  },
})
```

Built-ins live in `@zpress/theme/theme-registry.ts` (`BUILT_IN_THEMES`). Their CSS is pre-generated at build time into `packages/ui/src/theme/styles/themes/*.css` and inlined via `@zpress/ui/head/css/themes/*.css` for FOUC-free first paint.

### B. Override a few colors of a built-in

Same `theme.colors` / `theme.darkColors` keys (`ThemeColors` in `@zpress/theme/types.ts`):

```ts
;brand | brandLight | brandDark | brandSoft
;bg | bgAlt | bgElv | bgSoft | homeBg
;text1 | text2 | text3
divider | border
```

Each maps to one or more `--zp-c-*` / `--rp-c-*` CSS custom properties. Cheap, no token-tree authoring required.

### C. Register a brand-new custom theme

Two-step pattern (lives in `zpress.config.ts` — see the `sunsetTheme` example):

```ts
import { defineConfig, defineTheme } from '@zpress/kit'

const sunsetTheme = defineTheme({
  name: 'sunset',
  modes: ['dark'],            // which modes this theme renders correctly under; default ['dark','light']
  defaultMode: 'dark',        // 'dark' | 'light' | 'toggle' — default 'toggle'
  tokens: {                   // FULL token tree — tokensSchema is .strict()
    colors:    { brand: {…}, semantic: {…}, surface: {…}, text: {…}, border: {…}, tint: {…}, … },
    fonts:     {…},
    radii:     {…},
    shadows:   {…},
    motion:    {…},
    spacing:   {…},
    sizes:     {…},
    opacities: {…},
    zIndex:    {…},
    blurs:     {…},
    gradients: {…},
    // …everything else listed in `ZpressTokens`
  },
})

export default defineConfig({
  theme: { name: 'sunset', switcher: true },   // pick it
  themes: [sunsetTheme],                       // register it
})
```

Pipeline once registered:

1. `config.themes: ZpressThemeInput[]` is validated by `zpressThemeInputSchema` (envelope only).
2. `@zpress/ui` calls `defineTheme` per entry → `tokensSchema.parse(...)` validates the token tree strictly. Validation failure throws a `ZodError` at config time.
3. Each `ZpressTheme` is fed to `themeToCss(theme)` → a single deterministic `html[data-zp-theme='{name}']{…}` block.
4. Generated CSS is appended to the built-in theme stylesheet bundle.
5. Theme metadata is also injected as the `__ZPRESS_THEME_REGISTRY__` rsbuild `define`, so the runtime `<ThemeSwitcher>` lists it in the dropdown.

## API surface (what to import from where)

| From            | Export                                                 | What it is                                                                                      |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `@zpress/kit`   | `defineConfig`                                         | Top-level config helper                                                                         |
| `@zpress/kit`   | `defineTheme`                                          | Theme factory (Zod-validated, returns frozen `ZpressTheme`) — re-exported from `@zpress/config` |
| `@zpress/kit`   | `ZpressThemeInput` (type)                              | Input shape for `defineTheme`                                                                   |
| `@zpress/theme` | `BUILT_IN_THEMES`, `themeToCss`                        | Lower-level — only needed for tooling/inspection                                                |
| `@zpress/theme` | `ZpressTokens`, `TokenPath`, `TOKEN_TO_CSS_VAR`        | Token type tree + CSS-var mapping                                                               |
| `@zpress/theme` | `ThemeConfig`, `ThemeColors`, `ColorMode`, `ThemeName` | Types for `config.theme.*`                                                                      |
| `@zpress/theme` | `themeConfigSchema`, `tokensSchema`                    | Zod schemas (already wired into `zpressConfigSchema`)                                           |

## Notes

- The `tokens` field on `ZpressThemeInput` is typed `unknown` — schema validation is the factory's job, so callers get a single error surface (`ZodError` from `tokensSchema.parse`).
- `themeToCss` is byte-deterministic — it iterates `TOKEN_PATHS` (frozen `Object.keys(TOKEN_TO_CSS_VAR)`) in declaration order. Same input → same output bytes.
- Custom theme names work anywhere a built-in name does (`ThemeName` is `LiteralUnion<'base'|'midnight'|'arcade', string>`), so `theme.name: 'sunset'` is type-safe once the theme is in `themes: [...]`.
- `tokensSchema` is `.strict()` — partial tokens are rejected. There's no "extend a built-in" shorthand; you author a full tree or use `theme.colors`/`theme.darkColors` overrides on a built-in (option B).

**One soft DX gap to flag:** there's no `defineTheme.extend(BUILT_IN_THEMES.base, { … })` helper. If users want a "midnight but with orange brand" custom theme today, they either (a) use `theme.darkColors` overrides on `midnight` (cheap, but capped at the `ThemeColors` keys above), or (b) hand-author a full token tree. Worth considering an `extendTheme` helper post-1.0 if this comes up.
