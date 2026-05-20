---
name: svg-creator
description: >-
  This skill should be used when the user wants to create, fix, or convert
  SVG assets in any project — banners, badges, icons, logos, window/IDE
  mockups, terminal screenshots, or diagram nodes. Common triggers include
  "create an SVG", "make a banner", "design an icon", "draw a logo", "fix
  the viewBox", "convert SVG to PNG", and "preview this SVG". Bakes in
  edge-to-edge viewBox discipline (`viewBox="0 0 W H"` — no padding, no
  offsets), hardcoded hex colors (SVG cannot read CSS variables), a Node-
  based local preview server for browser + chrome-devtools MCP screenshot
  verification, and sharp-based conversion to PNG / JPEG / WebP / AVIF.
  Skip when the asset is purely raster (no SVG source) or when only an
  existing PNG needs editing.

# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<asset-name>]'
user-invocable: true
model-invocable: true
---

# svg-creator

End-to-end procedure for creating SVG assets that render correctly across
every consumer (GitHub README, slide deck, web app, mobile email, social
card). Each section explains the why so you can adapt — don't follow them
mechanically.

## When to use

- "create an SVG for X"
- "make me a banner"
- "design an icon"
- "draw a logo"
- "fix the viewBox on this SVG"
- "convert this SVG to PNG / JPEG / WebP / AVIF"
- "preview this SVG so I can see how it'll look"

## When NOT to use

- The asset is purely raster (`.png` / `.jpg`) — there's no SVG source
- You're only editing an existing PNG (use a raster image editor)
- The user wants vector authoring with handles + Bézier curves (Figma / Inkscape)

## The viewBox rule (everything else hangs off this)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H">
```

The viewBox **must** start with `0 0` and use the actual content
dimensions. No offsets like `viewBox="120 40 660 420"`. No padding.

**Why:** padding inside an asset can't be removed downstream. It bakes
empty pixels into every usage, fights `object-fit: contain`, breaks
alignment in any consumer's layout, and makes the asset unreusable at
different sizes. Layout spacing belongs in the layout (CSS, README, slide
template), not in the asset.

**What this means in practice:** if you want a "window inside a workspace"
look, the workspace **is** the asset — make the workspace itself the
bounding box. Don't simulate "the window inside a frame" by offsetting the
window inside a larger viewBox.

## Workflow

### 1. Preflight (do this once per repo)

```bash
node scripts/preflight.mjs
```

Checks Node ≥ 20, that `sharp` is resolvable from cwd, and whether the
chrome-devtools MCP is configured. Prints fix commands and exits 1 if any
required dep is missing. Add `--install` (with optional `--yes` for
non-interactive use) to install missing deps via the repo's package
manager (auto-detects pnpm / yarn / bun / npm).

The chrome-devtools MCP is **optional but recommended** — it lets the
agent take screenshots of the preview to verify the asset before declaring
it done. Without it, fall back to opening the preview URL in a real
browser.

### 2. Plan before drawing

Three decisions before you write any SVG:

1. **Dimensions.** Pick W and H from the actual content's bounding box,
   not the consumer's display size. Sensible defaults:

   | Use case                    | Recommended          |
   | --------------------------- | -------------------- |
   | GitHub repo banner (5:1)    | `1280×256`           |
   | Square badge / icon         | `96×96` or `128×128` |
   | Window / IDE / CLI mockup   | `660×420`            |
   | Wide hero strip (16:5)      | `1920×400`           |
   | Open Graph / social card    | `1200×630`           |
   | Favicon source (downscaled) | `512×512`            |

2. **Filename.** kebab-case or snake_case, lowercase, descriptive
   (`banner-active.svg`, not `BannerActive.svg`). Match the consuming
   repo's convention.

3. **Target directory.** Use whatever convention the consuming repo
   already follows. Common: `assets/`, `public/`, `art/`, `docs/img/`.

### 3. Author the SVG

Apply the viewBox rule above. Three craft notes:

**Colors** — SVGs cannot read CSS variables. Hardcode hex values.
[`references/colors.md`](references/colors.md) is a starter palette;
override per project.

**Typography** — pick fonts upfront. `system-ui, sans-serif` is safest for
cross-machine consistency. For pixel-perfect text across machines, embed a
webfont via `<style>@font-face{...}</style>` with a base64-encoded payload
inside the SVG.

**Recipes** — [`references/patterns.md`](references/patterns.md) has copy-
pasteable patterns for repo banners, badges, window chrome, terminals,
diagram nodes, arrows, and icons — including viewBox math and common
anti-patterns.

### 4. Lint the viewBox

```bash
node scripts/lint-viewbox.mjs path/to/asset.svg
# or recursively over a directory:
node scripts/lint-viewbox.mjs assets/
```

Checks: viewBox exists, is well-formed, starts with `0 0`, has positive
width/height. Exits 1 with a fix hint on failure. Edit and re-run until
clean.

### 5. Preview in a browser (and screenshot via chrome-devtools MCP)

```bash
node scripts/preview-server.mjs path/to/asset.svg
```

Picks a free port from a small pool of uncommon defaults (`5879`, `6321`,
`7843`, `8765`, `9876`, `31415`, `42420`, `47821`, `51234`, `61234`),
falls back to OS-assigned if all bound. Serves an HTML page that renders
the SVG via `<img src="/svg">` — the same path real consumers use, so
what you see is what you'll ship. Endpoints: `/`, `/svg`, `/health`. Run
in background so the agent can keep working.

If you have the chrome-devtools MCP, **don't write-and-stop**: navigate to
the printed URL, take a screenshot, and inspect. Catching an off-by-one
viewBox via screenshot is cheap; fixing it after the user notices is not.

```
1. node scripts/preview-server.mjs path/to/asset.svg   (background)
2. chrome-devtools MCP: navigate_page → http://localhost:<port>/
3. chrome-devtools MCP: take_screenshot
4. inspect — does it look right? clipping? wrong colors? phantom whitespace?
```

If you don't have chrome-devtools MCP, open the URL in a real browser
instead. Either way, **verify visually before declaring the asset done.**

### 6. Convert to a raster format (optional — ask the user)

Most consumers eventually need a PNG fallback (READMEs, slide decks,
social cards). Don't auto-convert — ask the user whether they want a
raster sibling, in which format, and at what dimensions.

```bash
node scripts/convert.mjs path/to/asset.svg
node scripts/convert.mjs path/to/asset.svg --format webp --width 800
node scripts/convert.mjs path/to/asset.svg --format jpeg --quality 85 --out preview.jpg
```

Defaults: PNG, sibling path, density 144 DPI for font crispness, native
SVG dimensions. Supports `png`, `jpeg`, `webp`, `avif`.

### 7. Confirm

Tell the user:

- Where the asset lives (`<path>/<name>.svg`)
- The preview URL (if the server is still running)
- Dimensions and a one-line description
- Whether a raster sibling was generated, and where

If anything in steps 4–6 failed, surface it explicitly — don't claim
success when only the SVG was written.

## Modifying an existing SVG

1. Read the file before editing.
2. Make the smallest possible edit.
3. Re-run the lint.
4. Re-preview (the server reads fresh on each request — no cache).
5. Re-screenshot via chrome-devtools MCP if available.

## Examples

<example>
<input>
"make me a github readme banner for my project 'TaskForge' — 1280x256, dark theme with purple gradient"
</input>
<output>
1. Plan: 1280×256, file `banner-taskforge.svg`, target `assets/`.
2. Author with `viewBox="0 0 1280 256"`, full-bleed gradient `<rect width="1280" height="256" fill="url(#bg)">`, hardcoded hex stops `#7268F0` → `#B667EF`, hardcoded font `Geist, system-ui, sans-serif`. (See `references/patterns.md` → "GitHub repo banner".)
3. `node scripts/lint-viewbox.mjs assets/banner-taskforge.svg` → ✓ pass.
4. `node scripts/preview-server.mjs assets/banner-taskforge.svg &` → http://localhost:5879/
5. chrome-devtools MCP: `navigate_page` then `take_screenshot` — confirm gradient covers full bounds, text doesn't clip.
6. Ask user: "Want a PNG sibling for non-SVG-aware consumers?" If yes: `node scripts/convert.mjs assets/banner-taskforge.svg`.
7. Confirm: "asset at `assets/banner-taskforge.svg`, preview at http://localhost:5879/, 1280×256."
</output>
</example>

<example>
<good>
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 420" width="660" height="420">
  <rect width="660" height="420" rx="10" fill="#1A1A1A"/>
  <!-- content positioned from origin -->
</svg>
```
</good>

<bad>
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="120 40 660 420" width="660" height="420">
  <rect x="120" y="40" width="660" height="420" rx="10" fill="#1A1A1A"/>
  <!-- content offset by 120/40 — bakes phantom padding into the asset -->
</svg>
```
</bad>

The `<bad>` example fails the lint and renders with phantom whitespace
when consumed via `<img>` or `object-fit: contain`. Fix: shift every
child's coordinate by the offset and reset the viewBox to `0 0 660 420`.
</example>

## References

- [`references/colors.md`](references/colors.md) — starter palette and typography rules
- [`references/patterns.md`](references/patterns.md) — copy-pasteable SVG recipes (banners, badges, windows, terminals, icons, arrows)

## Files in this skill

- `SKILL.md` — this file
- `evals.json` — pressure scenarios + assertions
- `scripts/preflight.mjs` — runtime dependency check
- `scripts/preview-server.mjs` — local Node HTTP preview server
- `scripts/convert.mjs` — sharp-based SVG → PNG / JPEG / WebP / AVIF converter
- `scripts/lint-viewbox.mjs` — viewBox lint (enforces `0 0 W H`)
- `references/colors.md` — color and typography starter palette
- `references/patterns.md` — copy-pasteable SVG recipes
