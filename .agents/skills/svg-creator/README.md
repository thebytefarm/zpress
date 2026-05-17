# svg-creator

> Create, fix, and convert SVG assets that render correctly across every consumer — GitHub READMEs, slide decks, web apps, social cards. Bakes in edge-to-edge viewBox discipline, hardcoded hex colors, a Node-based local preview server, and `sharp` conversion to PNG / JPEG / WebP / AVIF.

Agent-agnostic. Works with any agent that loads `SKILL.md`. Optional integration with the [chrome-devtools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) for agent-driven screenshot verification of the preview.

## What it bakes in

- **viewBox discipline** — every SVG starts with `viewBox="0 0 W H"`, no offsets, no padding. Lint script enforces.
- **Edge-to-edge content** — layout spacing belongs in the consumer (CSS / README / slide template), not in the asset.
- **Hardcoded hex colors** — SVG cannot read CSS variables, so the skill bakes in a starter palette and reminds you why.
- **Node preview server** — picks a free port from a small uncommon-port pool, serves an HTML page rendering the SVG via `<img>`. Designed for chrome-devtools MCP to navigate + screenshot.
- **Opt-in raster conversion** — `sharp`-based PNG / JPEG / WebP / AVIF output. Asks the user before converting; doesn't auto-generate siblings.
- **Preflight bootstrap** — one script checks Node version, `sharp` availability, and chrome-devtools MCP presence; offers to install the missing pieces via the repo's package manager.

## Files

```
svg-creator/
├── SKILL.md                          # the workflow
├── README.md
├── LICENSE
├── evals.json                        # pressure scenarios + assertions
├── references/
│   ├── colors.md                     # starter hex palette + typography
│   └── patterns.md                   # copy-pasteable SVG recipes
└── scripts/
    ├── preflight.mjs                 # checks Node / sharp / chrome-devtools MCP
    ├── preview-server.mjs            # local HTTP preview (free-port pool)
    ├── convert.mjs                   # sharp-based SVG → PNG/JPEG/WebP/AVIF
    └── lint-viewbox.mjs              # viewBox lint (0 0 origin, well-formed)
```

## Install

```sh
npx skills add zrosenbauer/skills --skill svg-creator
```

Then run the preflight from the skill's install directory to wire up `sharp`:

```sh
node .agents/skills/svg-creator/scripts/preflight.mjs --install
```

## License

[MIT](./LICENSE) © Zac Rosenbauer
