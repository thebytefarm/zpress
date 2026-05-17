# skill-reviewer

Reviews an existing agent skill in this repo against authoring conventions. Produces a severity-tiered report (`error` / `warn` / `info`) with a Clean section, classifies the skill type, audits `evals.json` assertion shapes for brittleness, and offers a behavioral handoff via `skill-eval`.

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

## What it bakes in

This is a **discipline skill** — `pnpm skill-tools lint` already covers mechanical rules, so the gap this skill closes is the lazy-reviewer failure mode:

- **Skill-type classification first** (discipline / technique / pattern / reference) so the audit lens matches the skill
- **Deep-reference reading** beyond `lint-checklist.md` — `pressure-scenarios.md`, `evals-json.md`, `tdd-for-skills.md`
- **Severity-tiered output** (`error` / `warn` / `info`) with `file:line` pointers — comparable across runs
- **Clean section even on a pass** — forces grounding in specific rules instead of "looks solid"
- **`evals.json` brittleness audit** — per-line negative regex, prompt-echo regex, double-assert, literal-word matches, LLM-as-judge sneaking in
- **Behavioral handoff** — checks whether `/skill-eval` is invocable in the current session and either invokes it or prompts to install

## Why it exists

A RED-baseline run of three review prompts against this repo's defaults caught real issues but did so unevenly: 0/3 reviews classified the skill type, 1/2 used severity tiers, and 0/1 produced a Clean section on a pass verdict. The eval-0 reviewer self-reported "Skipped: pressure-scenarios.md, evals-json.md, tdd-for-skills.md — relied on lint-checklist summary." This skill closes those gaps.

## Usage

```
/skill-reviewer ts-best-practices
```

Or with no arg:

```
/skill-reviewer
> Which skill should I review?
```

## Installation

Public skill — install with:

```bash
npx skills add zrosenbauer/skills
```

Or load directly from `skills/skill-reviewer/` if you've cloned the monorepo.

## License

MIT — see [`LICENSE`](LICENSE).
