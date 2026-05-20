---
name: skill-reviewer
description: >-
  This skill should be used when the user wants to review, audit, or
  sanity-check an existing agent skill in this repo against authoring
  conventions. Common triggers include "review the X skill", "audit this
  skill", "check skill X against repo conventions", "is this skill any good",
  "second opinion on skill X", "sanity check skill X", and "review skill X
  before publishing". Produces a severity-tiered report (error / warn / info)
  with a Clean section even on pass, audits evals.json assertion shapes, and
  hands off behavioral validation to skill-eval. Skip when authoring a
  brand-new skill (use skill-creator) or running general code review (use
  code-reviewer).

# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<skill-name>]'
user-invocable: true
model-invocable: true
---

# skill-reviewer

Reviews an existing skill in this repo against authoring conventions. Produces a severity-tiered report (error / warn / info) plus a Clean section, classifies the skill type, audits `evals.json` assertion shapes, and offers a behavioral handoff via `skill-eval`.

## When to use

Verbatim trigger phrases:

- "review the X skill"
- "audit this skill"
- "check skill X against repo conventions"
- "is this skill any good?"
- "second opinion on skill X"
- "review skill X before publishing"
- "sanity check skill X"

## When NOT to use

- Authoring a brand-new skill → use `/skill-creator`
- Re-running baselines on an existing skill → use `/skill-eval`
- Reviewing source code, diffs, or PRs → use `/code-reviewer`
- Fixing the skill body — just edit `SKILL.md` directly

## Inputs

`$ARGUMENTS` — one of:

- A skill name (`ts-best-practices`) — looks under `skills/<name>/` then `.agents/skills/<name>/`
- A path (`skills/foo/SKILL.md` or `skills/foo`)
- Empty — ask: "Which skill should I review?"

## Workflow

### 1. Resolve target + run lint baseline

Locate the skill directory. Confirm `SKILL.md` and `evals.json` exist. Run:

```bash
pnpm skill-tools lint <skill-name>
```

Capture the lint output verbatim — it's the floor, not the ceiling. Lint passing means **mechanical** rules pass; it does not mean the skill is well-authored.

### 2. Classify the skill type

Pick exactly one — this dictates which audit lens to apply (per [`skill-creator/references/pressure-scenarios.md`](../skill-creator/references/pressure-scenarios.md)):

| Type           | Examples                                                      | Audit focus                                                                                           |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Discipline** | "always run the test", "never use `any`", "always use Result" | Rationalization table present? Pressure scenarios combine 3 pressures (time + sunk-cost + authority)? |
| **Technique**  | "use ts-pattern for branching", "use zod for parsing"         | Scenarios stress variation + missing information? Skill triggers across phrasings?                    |
| **Pattern**    | "use \*Params for ≥2-arg fns", "kebab-case files"             | Scenarios include counter-examples + recognition (when NOT to fire)?                                  |
| **Reference**  | "API X works like…", "convention Y says…"                     | Scenarios mix retrieval + gap testing? Skill declines questions outside its scope?                    |

State the classification explicitly. If you can't classify it cleanly, that's itself a finding (the skill's purpose is fuzzy).

### 3. Read the deep references — not just the lint summary

Lint enforces frontmatter shape, naming, anti-shortcut words. Deep references cover what lint can't:

- [`skill-creator/references/description.md`](../skill-creator/references/description.md) — description quality beyond char count
- [`skill-creator/references/pressure-scenarios.md`](../skill-creator/references/pressure-scenarios.md) — scenario quality + skill-type classification
- [`skill-creator/references/evals-json.md`](../skill-creator/references/evals-json.md) — assertion shape + double-assert + LLM-as-judge avoidance
- [`skill-creator/references/tdd-for-skills.md`](../skill-creator/references/tdd-for-skills.md) — RED → GREEN → REFACTOR cycle expectations
- [`skill-creator/references/xml-usage.md`](../skill-creator/references/xml-usage.md) — when to use `<example>` / `<good>` / `<bad>`

If you skip these and only cite `lint-checklist.md`, you're guessing at depth.

### 4. Audit frontmatter + description

Beyond the lint pass:

- Description has all 3+ verbatim triggers in **double quotes**
- Description has an explicit `Skip when …` clause naming what the skill does NOT do
- Triggers in description are realistic (a real user would say them) — not abstract teacher-ese
- Trigger parity: same triggers in `description`, `## When to use`, and `README.md` (drift is a warn)
- Description states what's distinctive ("Bakes in …") — not just what the skill does
- Claude Code extension fields present (`argument-hint`, `user-invocable`, `model-invocable`) and fenced behind the `# --- Claude Code extensions` comment

### 5. Audit body

- ≥ 3 `## ` sections
- At least one `<example>` block
- No `TODO` / `FIXME` / `XXX`
- Workflow steps are numbered actions (not prose)
- Discipline skills MUST have a `## Rationalization table` section (per [`skill-creator`](../skill-creator/SKILL.md) step 7.5) — its absence on a discipline skill is an `error`
- Body ≤ 500 lines

### 6. Audit `evals.json`

Read every assertion. Common brittleness patterns to flag (per [`evals-json.md`](../skill-creator/references/evals-json.md)):

- **Negative regex anchored per-line** (`^(?!.*X).*$`) — matches if any line lacks X; passes even when X appears on another line.
- **Regex matches a substring of the prompt itself** — agent restating the prompt verbatim trips the assertion without doing the work.
- **Two assertions checking the same property** (e.g. `regex /@param/` + `contains "@param"`) — double-assert; over-fits to one phrasing.
- **Literal-word match on common English** (e.g. plain `(error|warn|info)` as words) — those words appear in any prose; assertion has no teeth.
- **LLM-as-judge phrasing leaking in** (e.g. `"output conveys expertise"`) — drifts across model versions; not deterministic.
- **< 3 evals on a public skill** — insufficient pressure surface (lint also catches).
- **All scenarios share one phrasing / one happy path** — misses recognition + counter-example coverage.
- **Single-pressure on a discipline skill** — discipline skills need 3 pressures combined; one pressure is too easy.

Also check: pressure scenarios match the skill type (per step 2). A discipline skill with technique-shaped scenarios is mis-pressured.

### 7. Behavioral handoff via `skill-eval`

Static review only catches authoring issues. Behavioral check catches "skill doesn't actually change agent behavior".

1. Check whether `skill-eval` is invocable in the current session:
   - `skills/skill-eval/SKILL.md` exists in the repo? (it does in this monorepo)
   - `/skill-eval` slash command is loaded? (check the skill list / `.claude/` config)
   - The Agent / Task dispatch tool is available? (skill-eval orchestrates subagents)
2. State the result explicitly. Don't silently skip the behavioral half.
3. If invocable, propose:

   ```
   /skill-eval <skill-name>
   ```

   Or the manual path:

   ```bash
   node packages/skill-tools/dist/index.mjs eval <skill-name> <id> \
     --variant with_skill --iteration N \
     --transcript <path>
   node packages/skill-tools/dist/index.mjs benchmark <skill-name>
   ```

4. If NOT invocable, prompt the user to install / load it before behavioral review can happen. Do not pretend the static review covered behavior.

### 8. Emit severity-tiered output (with Clean section, even on pass)

Use this exact format. The Clean section is **mandatory** — it forces grounding the verdict in specific rules rather than vibes.

```
SUMMARY: <N> findings (<E> error / <W> warn / <I> info) — <skill-type> skill

## ERRORS
✗ <file>:<line>  <one-line-finding>
  <body — what's wrong, why it matters, suggested edit>

## WARNS
⚠ <file>:<line>  <one-line-finding>
  <body>

## INFOS
ℹ <file>:<line>  <one-line-finding>
  <body>

## Clean
- <specific rule that passes — e.g., "Description has 5 verbatim triggers in double quotes (description.md:38)">
- <another specific rule>
- <`pnpm skill-tools lint <name>` — <pass/fail summary>>
```

Empty severity sections render as `## ERRORS\n(none)` — keeps the shape comparable across runs. A pass verdict is `0 error / 0 warn / 0 info` plus a populated Clean section.

## Anti-patterns (don't do these)

<bad>
"Looks solid, ship it."
</bad>

No grounding. The pass verdict carries no information the user can act on or revisit later. Use a Clean section listing specific rules.

<bad>
"Lint passes, looks fine."
</bad>

Lint is the floor. This is the lazy-reviewer failure mode — see step 3.

<bad>
Manufactured nits because the skill seemed *too* clean and the reviewer wanted to look thorough.
</bad>

If a skill genuinely has 0 findings, say so in the Clean section. Inventing critique to look thorough is worse than missing real issues.

<bad>
Recommended `/skill-eval` without checking whether it was actually loaded in the session.
</bad>

The user has to chase down whether the recommendation was even runnable. Step 7 is explicit about this: check first, state the result.

## Examples

<example>
<input>"review skills/ts-best-practices — does it still hold up against our conventions?"</input>
<output>
1. Resolve: `skills/ts-best-practices/`. Run `pnpm skill-tools lint ts-best-practices` → clean.
2. Classify: **discipline skill** (rules like "use *Params for ≥2-arg fns", "JSDoc on exports").
3. Read deep references: `description.md`, `pressure-scenarios.md`, `evals-json.md`, `tdd-for-skills.md`.
4. Frontmatter audit: trigger parity drift — `SKILL.md` has 6 triggers, `description` and `README.md` have 5. Description missing `"audit this ts file"`.
5. Body audit: rationalization table present (good — discipline skill). `@pkg/fp` in conditionals table leaks an internal-monorepo assumption.
6. evals.json audit: eval #0 assertion `^(?!.*:\s*any\b).*$` is a per-line negative regex — passes if any single line lacks `any`. Same shape on eval #1's "no else-if" / "no ternary".
7. Behavioral handoff: `skills/skill-eval/SKILL.md` present + `/skill-eval` loaded → propose `/skill-eval ts-best-practices`.
8. Emit:

```
SUMMARY: 4 findings (1 error / 2 warn / 1 info) — discipline skill

## ERRORS
✗ evals.json:29  three negative-regex assertions match per-line — pass when bad pattern appears on another line
  Replace `^(?!.*:\s*any\b).*$` with a `not_contains` pattern or anchor with `(?s)` so the whole transcript is one match.

## WARNS
⚠ description (SKILL.md:5)  trigger parity drift vs. README.md (5 vs 6 triggers; missing "audit this ts file")
  Add the missing trigger to description and README — the description is the dispatcher's surface.
⚠ SKILL.md:184  `@pkg/fp` reference leaks a private-monorepo assumption into a public skill
  Replace with "ternary helper" or add a one-line reference link.

## INFOS
ℹ description (SKILL.md:11)  Skip-when bundles two cases with an em dash
  Split the framework case (React/Vue/Svelte) from the functional-refactor redirect.

## Clean
- Description has Use-when phrase + 5 verbatim triggers in double quotes (description.md:38)
- Frontmatter has all Claude Code extension fields (argument-hint, user-invocable, model-invocable)
- Body has 2 <example> blocks (xml-usage.md ≥ 1 required)
- Rationalization table present — appropriate for a discipline skill (skill-creator step 7.5)
- pnpm skill-tools lint ts-best-practices — 0 error / 0 warn / 0 info
- Behavioral handoff: /skill-eval is loaded; recommended `/skill-eval ts-best-practices`
```

</output>
</example>

<example>
<input>"sanity-check skills/skill-portability — i think it's fine"</input>
<output>
Lint clean. Classified as a **technique skill** (replaces ad-hoc provider knowledge with a structured providers.mjs lookup).

```
SUMMARY: 0 findings (0 error / 0 warn / 0 info) — technique skill

## ERRORS
(none)

## WARNS
(none)

## INFOS
(none)

## Clean
- Description: 720 chars, has Use-when, 5 verbatim triggers, explicit Skip-when (description.md ✓)
- Frontmatter: argument-hint, user-invocable, model-invocable all set
- evals.json: 5 pressure scenarios (≥ 3 required), mix includes a clean-skill recognition test (the false-positive guard most skills miss)
- Body: ≥ 3 `## ` sections, ≥ 1 `<example>` block, no TODO/FIXME
- Companions: README.md, LICENSE, references/, scripts/ all present
- Single-source-of-truth in providers.mjs reflects the skill's own thesis
- pnpm skill-tools lint skill-portability — 0/0/0
- Behavioral handoff: /skill-eval is loaded; propose `/skill-eval skill-portability`
```

Nothing manufactured. If you want depth beyond the structural review, run `node skills/skill-portability/scripts/providers.mjs --check` to confirm the docUrls are still 200 — that's the skill's own staleness check.

</output>
</example>

## Rationalization table

Captured from RED-baseline transcripts where reviewers without this skill skipped rules. Future reviewers: recognize your own pattern.

| Skipped rule                                                           | Verbatim excuse                                                          | Why it's wrong                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read `pressure-scenarios.md` / `evals-json.md` / `tdd-for-skills.md`   | "relied on lint-checklist summary"                                       | Lint enforces mechanical rules; these refs cover assertion shape, scenario-vs-skill-type fit, and the RED→GREEN cycle that lint cannot check                                                                     |
| Classify the skill type (discipline / technique / pattern / reference) | (omitted entirely)                                                       | Different types need different audits — discipline skills require a rationalization table and 3-pressure scenarios; technique skills need variation tests; without classification you're applying the wrong lens |
| Use severity-tiered output (`error` / `warn` / `info`) even on a pass  | "used numbered findings" / "prose verdict"                               | Comparable output across runs; numbered lists drift in shape; prose ("looks solid") invites manufactured-nits or vague-pass failure modes                                                                        |
| Include a Clean section listing what specifically passes               | "said 'looks solid' / 'ship it'"                                         | Pass verdicts without specifics rot — six months later nobody knows what was actually checked. Clean sections force grounding in specific rules                                                                  |
| Check whether `skill-eval` is invocable before recommending it         | "I located the tooling" without checking if it's loadable in the session | Pushes work onto the user to verify the recommendation. Step 7 requires explicit availability check + result statement                                                                                           |
| Run the static review without offering the behavioral handoff          | "the static review covered the structural concerns"                      | Static review can't catch "skill doesn't actually change agent behavior" — that's exactly what `skill-eval` exists for. Skipping it leaves the second half of the request undone                                 |

## References

- [`skill-creator/SKILL.md`](../skill-creator/SKILL.md) — authoring workflow this reviewer audits against
- [`skill-creator/references/description.md`](../skill-creator/references/description.md) — description quality rules
- [`skill-creator/references/pressure-scenarios.md`](../skill-creator/references/pressure-scenarios.md) — scenario quality + skill-type classification
- [`skill-creator/references/evals-json.md`](../skill-creator/references/evals-json.md) — assertion shape + brittleness patterns
- [`skill-creator/references/tdd-for-skills.md`](../skill-creator/references/tdd-for-skills.md) — RED → GREEN → REFACTOR cycle
- [`skill-creator/references/lint-checklist.md`](../skill-creator/references/lint-checklist.md) — mechanical rules (the floor)
- [`skill-creator/references/xml-usage.md`](../skill-creator/references/xml-usage.md) — `<example>` / `<good>` / `<bad>` boundaries
- [`skill-eval/SKILL.md`](../skill-eval/SKILL.md) — behavioral handoff
- [`code-reviewer/references/review-output-format.md`](../code-reviewer/references/review-output-format.md) — three-tier output spec inspiration
