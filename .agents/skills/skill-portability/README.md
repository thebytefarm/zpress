# skill-portability

> Audit whether an agent skill is portable across the major agent providers — Claude Code, Cursor, OpenAI Codex CLI, and the Agents-Skills Baseline (Gemini CLI / OpenCode / Pi). Three-layer check (format, body, tool surface) backed by a zero-dep `providers.mjs` ESM script.

## Install

```bash
npx skills add zrosenbauer/skills --skill skill-portability
```

## What it does

- Reads a skill's frontmatter and body (SKILL.md, .mdc, or AGENTS.md)
- Loads the canonical provider list via `node scripts/providers.mjs`
- Spawns one agent per provider in **parallel**, each fetching the provider's authoritative llms.txt docs and grading the skill against three layers
- Aggregates verdicts into a markdown matrix shown inline AND persisted to `COMPAT.md` next to the skill
- Surfaces stale provider URLs so the audit doesn't silently grade against 404s

## The three audit layers

| Layer        | Question answered                                                               |
| ------------ | ------------------------------------------------------------------------------- |
| Format       | Will the provider's loader accept this file? Required frontmatter present?      |
| Body         | Are body conventions (XML tags, headings, sections) parsed by the provider?     |
| Tool surface | Does the body name tools (`AskUserQuestion`, `TodoWrite`) the provider exposes? |

## Trigger phrases

- "is this skill cross-provider safe"
- "will my skill work in cursor"
- "will this load in codex"
- "audit skill compatibility"
- "check if this skill is portable"
- "which providers support this skill"

## The providers script

```bash
node scripts/providers.mjs               # JSON to stdout (compact)
node scripts/providers.mjs --pretty      # JSON pretty-printed
node scripts/providers.mjs --table       # human-readable table
node scripts/providers.mjs --check       # HEAD each docUrl, mark stale URLs
node scripts/providers.mjs --ids         # one id per line
```

Zero dependencies. Pure ESM. Runs on stock Node ≥ 20 — macOS, Linux, Windows. Importable as a module too:

```js
import { providers, getProvider } from './scripts/providers.mjs'
```

When a provider moves their docs, update `scripts/providers.mjs` and ship a PR. Run `--check` against the URLs first to confirm they 200.

## Currently covered providers

- **Claude Code** (Anthropic) — native `SKILL.md` format
- **Cursor** — `.cursor/rules/*.mdc` rule files
- **OpenAI Codex CLI** — `AGENTS.md` plain markdown
- **Agents-Skills Baseline** — `SKILL.md` under `.agents/skills/`; the lowest-common-denominator format consumed by Gemini CLI, OpenCode, Pi, and any other agent that adopts the [agentskills.io](https://agentskills.io/specification) spec

Adding a provider means adding one entry to the array in `scripts/providers.mjs` — the audit body re-reads the script every run, so no SKILL.md edit is required.

## License

[MIT](./LICENSE) © Zac Rosenbauer
