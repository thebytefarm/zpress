---
name: skill-portability
description: >-
  This skill should be used when the user wants to check whether an agent
  skill is portable across providers. Common triggers include "is this skill
  cross-provider safe", "will my skill work in cursor", "audit skill
  compatibility", "check if this loads in codex", and "which providers
  support this skill". Spawns one agent per provider in parallel using
  bundled provider-doc snapshots (refreshed on cadence — never fetched at
  runtime) and produces a compatibility matrix plus a COMPAT.md report.
  Skip when authoring a new skill (use skill-creator) or rerunning
  baselines (use skill-eval).

# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<skill-path-or-name>]'
user-invocable: true
model-invocable: true
---

# skill-portability

Audits whether an agent skill loads and behaves correctly across the major
providers — Claude Code, Cursor, OpenAI Codex CLI, and the Agents-Skills
Baseline (covering Gemini CLI, OpenCode, Pi). See [`scripts/providers.mjs`](scripts/providers.mjs)
for the canonical list. The audit covers three layers:

1. **Format-level** — does the file/dir structure and frontmatter match what
   the provider expects?
2. **Body-level** — does the body reference provider-specific conventions
   (XML tags, headings) that other providers ignore?
3. **Tool-surface-level** — does the body name tools (e.g.,
   `AskUserQuestion`) that only exist in one provider?

The canonical provider list, required/forbidden frontmatter fields, and
**bundled doc snapshots** live in [`scripts/providers.mjs`](scripts/providers.mjs)
and [`references/providers/`](references/providers/). Provider docs are
refreshed at authoring time via `pnpm skill-tools refresh-provider-docs`
and committed — the audit never fetches at runtime, so per-provider
verdicts are deterministic and offline-capable.

## When to use

Verbatim trigger phrases:

- "is this skill cross-provider safe"
- "will my skill work in cursor"
- "will this load in codex"
- "audit skill compatibility"
- "check if this skill is portable"
- "which providers support this skill"
- "is my skill claude-only"

## When NOT to use

- Authoring a brand-new skill → use `skill-creator`
- Rerunning a skill's existing eval baselines → use `skill-eval`
- Linting a skill against this monorepo's rules → use `pnpm skill-tools lint`
- Comparing skill behavior across model versions → that's `skill-eval`, not this

## Inputs

`$ARGUMENTS` — one of:

- A path to a skill directory (`skills/code-reviewer/` or
  `skills/skill-creator/`)
- A path to a single SKILL.md / .mdc / AGENTS.md file
- A glob (`skills/*`) — bulk audit
- A literal frontmatter+body block pasted into the prompt
- Empty — discover via `ls skills/` and ask which to audit

## Workflow

### 1. Resolve the input

Determine what the user is auditing.

| Input              | Action                                                   |
| ------------------ | -------------------------------------------------------- |
| Directory path     | Read the SKILL.md (or .mdc / AGENTS.md) inside           |
| Single file path   | Read the file directly                                   |
| Glob               | Expand and audit each match                              |
| Pasted content     | Treat the prompt body as the skill content               |
| Empty `$ARGUMENTS` | List `skills/*/SKILL.md` and ask the user which to audit |

Parse the frontmatter (YAML between leading `---` markers) and remember the
body content. Both feed into the per-provider checks.

### 2. Load the canonical provider list

Run the bundled ESM script — no shell required, works on macOS, Linux, and
Windows:

```bash
node skills/skill-portability/scripts/providers.mjs --pretty
```

Capture the JSON. Each entry has `id`, `name`, `fileFormat`, `fileLocation`,
`docUrls`, `localDocPath`, `requiredFrontmatter`, `optionalFrontmatter`,
`ignoredFrontmatter`, `forbiddenFrontmatter`, `toolSurface`, and `notes`.

This script is the single source of truth. Don't hardcode provider details
into the audit body — re-run the script each time.

### 3. Fan out: one agent per provider, in parallel

Dispatch one `Agent` call per provider returned by step 2 (concurrent — one
tool message with all tool uses). Don't hardcode the count — `providers.mjs`
is the source of truth and may grow. Each agent gets:

- The provider entry from step 2 (id, format requirements, toolSurface, notes)
- **The bundled provider doc snapshot** read from `localDocPath` (e.g.
  `references/providers/cursor.md`). Read the file with the `Read` tool
  before dispatching the subagent and pass its contents inline in the
  subagent prompt — do NOT instruct the subagent to fetch.
- The skill content from step 1 (frontmatter + body)
- These instructions to the subagent:

  > Use the provider doc snapshot included in this prompt — it was bundled
  > with the skill at authoring time and is the authoritative reference
  > for this audit. Do NOT WebFetch any URL; if the snapshot is missing
  > details, surface that as a NOTES finding rather than fetching.
  >
  > Evaluate the skill against three layers:
  >
  > 1. **Format**: does it match `fileFormat`? Are all `requiredFrontmatter`
  >    fields present? Are any `forbiddenFrontmatter` fields present?
  > 2. **Body**: does the body lean on conventions this provider doesn't
  >    parse (e.g., XML tags Cursor strips, headings the baseline ignores)?
  > 3. **Tool surface**: does the body name tools not in this provider's
  >    `toolSurface`? List each unmatched tool name.
  >
  > Return a structured verdict:
  >
  > ```
  > VERDICT: compatible | partial | incompatible
  > FORMAT: <one-line summary>
  > BODY: <one-line summary>
  > TOOLS: <comma-separated unmatched tool names, or "none">
  > NOTES: <2–3 specific findings with file/line references where possible>
  > ```

Use `subagent_type: "general-purpose"`. Run all dispatches in **one**
message so they execute concurrently.

### 4. Aggregate the verdicts into a matrix

Build a markdown table with one row per provider and one column per layer:

```
| Provider                | Verdict      | Format              | Body          | Tools          |
| ----------------------- | ------------ | ------------------- | ------------- | -------------- |
| Claude Code             | compatible   | SKILL.md ✓          | clean         | -              |
| Cursor                  | partial      | needs .mdc          | XML stripped  | -              |
| OpenAI Codex CLI        | partial      | rename to AGENTS.md | clean         | Bash → shell   |
| Agents-Skills Baseline  | compatible   | SKILL.md ✓          | clean         | tool names vary |
```

Add a `NOTES` paragraph below summarizing the most actionable change to make
the skill more portable.

### 5. Write COMPAT.md and print the matrix inline

Two outputs:

- **Inline**: print the matrix + notes in chat so the user sees it immediately.
- **Persisted**: write `<skill-dir>/COMPAT.md` (or `./COMPAT.md` if no skill
  dir), containing: the matrix, the per-provider verdict bodies, the
  timestamp, and the `providers.mjs` `docUrls` actually fetched. The user can
  diff this over time to spot regressions when providers move docs.

For bulk audits (glob input), produce one combined matrix where rows are
skills, columns are providers, and write `COMPAT.md` at the repo root.

### 6. Handle missing or stale snapshots

If any provider's `localDocPath` doesn't exist or its snapshot is empty /
truncated to a placeholder, surface this in the inline output:

```
⚠ Provider snapshot missing or sparse: `cursor` — references/providers/cursor.md
  is 503 bytes (likely SPA-rendered upstream). Verdict relies on the
  `notes` field. Run `pnpm skill-tools refresh-provider-docs` to refresh.
```

Don't silently fall back to WebFetch — that's exactly the runtime fetch
behavior the bundled-snapshot design avoids. If a snapshot is genuinely
missing, treat it as `unknown` in the verdict rather than guessing.

To refresh snapshots from upstream (dev-time, not runtime):

```bash
pnpm skill-tools refresh-provider-docs
```

To verify URLs still resolve (HEAD requests, no body fetch):

```bash
node skills/skill-portability/scripts/providers.mjs --check
```

## Examples

<example>
<input>"is my code-reviewer skill cross-provider safe? it's at skills/code-reviewer/"</input>
<output>
1. Resolve: read `skills/code-reviewer/SKILL.md` → frontmatter has `name`,
   `description`, `argument-hint`, `user-invocable`, `model-invocable`. Body
   uses `<example>` blocks and references `AskUserQuestion`, `gh pr diff`,
   and a sibling `scripts/detect-clis.mjs`.
2. Load providers: `node skills/skill-portability/scripts/providers.mjs --pretty`
   → entries returned (currently 4).
3. Fan out one parallel `Agent` call per provider — Claude Code, Cursor, Codex CLI, Agents-Skills Baseline.
4. Aggregate verdicts:

| Provider               | Verdict    | Notes                                                           |
| ---------------------- | ---------- | --------------------------------------------------------------- |
| Claude Code            | compatible | native format                                                   |
| Cursor                 | partial    | needs `.cursor/rules/code-reviewer.mdc`; references/ won't load |
| OpenAI Codex CLI       | partial    | rename to AGENTS.md; `AskUserQuestion` not in tool surface      |
| Agents-Skills Baseline | compatible | loads from `.agents/skills/`; tool names vary per consumer      |

5. Write `skills/code-reviewer/COMPAT.md` with full per-provider bodies.
   </output>
   </example>

<example>
<input>Pasted: a `.mdc` file with `globs:` and `alwaysApply:` in frontmatter — "will this load in claude code?"</input>
<output>
1. Resolve: parse pasted content. Frontmatter: `description`, `globs`,
   `alwaysApply`. No `name` field.
2. Load providers list.
3. Fan out 4 parallel agents.
4. Verdicts:

- Claude Code: **incompatible** — missing required `name` field; `skills`
  CLI rejects without it. `globs`/`alwaysApply` are silently ignored.
- Cursor: **compatible** — this is native `.mdc` format.
- Codex CLI: **partial** — Codex reads AGENTS.md as plain markdown;
  frontmatter is silently ignored, content would still apply.
- Continue.dev: **partial** — move to `.continue/rules/<name>.md`;
  `globs` is supported, `alwaysApply` is not.

5. Recommend: add `name: <kebab-case>` to make portable; consider dropping
   `alwaysApply` since only Cursor honors it.
   </output>
   </example>

<example>
<good>
Ran `node scripts/providers.mjs --pretty` once at step 2. For each provider,
Read its `localDocPath` snapshot and inlined the contents into the
subagent prompt. Subagents evaluated against bundled docs — no runtime
WebFetch.
</good>

<bad>
Instructed subagents to WebFetch the provider docUrls at audit time. Result:
slow audits, stale-doc false negatives, runtime dependency on every
provider's docs site staying up.
</bad>

The bad version reintroduces the runtime URL fetch the snapshot pattern
exists to avoid. Snapshots are committed; refresh on cadence with
`pnpm skill-tools refresh-provider-docs`.
</example>

## References

- [`scripts/providers.mjs`](scripts/providers.mjs) — canonical provider list,
  format requirements, `localDocPath` for each provider's bundled snapshot.
  Run `--check` to verify upstream URLs still resolve.
- [`references/providers/`](references/providers/) — per-provider doc
  snapshots (auto-generated; refresh via `pnpm skill-tools refresh-provider-docs`).
- [`references/provider-formats.md`](references/provider-formats.md) —
  per-provider deep dive: frontmatter shape, file location conventions,
  tool surface, common porting gotchas.
- [`references/audit-prompt.md`](references/audit-prompt.md) — the verbatim
  prompt template handed to each subagent in step 3.
