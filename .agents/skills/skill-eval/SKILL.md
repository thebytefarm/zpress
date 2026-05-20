---
name: skill-eval
description: >-
  This skill should be used when the user wants to run baseline evaluations
  on existing agent skills, regenerate transcripts after a model upgrade,
  or check whether a skill still solves the gap it was authored for. Common
  triggers include "rerun the baselines", "re-eval skill X", "test all the
  skills", "check for skill drift", and "run the evals". Bakes in verbatim
  transcript capture (no paraphrasing), deterministic-only grading (regex
  / contains / file_exists — no LLM-as-judge), and the iteration-N
  workspace convention. Skip when authoring a new skill (use skill-creator)
  or modifying skill content directly.
# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<skill-name>|--all]'
user-invocable: true
model-invocable: true
---

# skill-eval

Re-run baseline evaluations on one or more skills. Uses the `evals.json` test definitions committed in each skill, dispatches pressure scenarios via subagents, saves transcripts to a gitignored workspace, and grades the runs deterministically.

## When to use

Verbatim trigger phrases:

- "rerun the baselines"
- "re-eval skill X"
- "test all the skills"
- "check for skill drift"
- "run the evals"
- "did skill X still pass"

## When NOT to use

- Authoring a new skill — use `/skill-creator` instead
- Modifying skill body content — just edit the SKILL.md
- Running unit tests for `packages/skill-tools` itself (those are vitest, not skill evals)

## Inputs

- `$ARGUMENTS` — one of:
  - `<skill-name>` — re-eval one skill (looks under `skills/` and `.agents/skills/`)
  - `--all` — re-eval every skill that has an `evals.json`
  - empty — same as `--all`

## Workflow

### 1. Resolve target skills

If `$ARGUMENTS` is a skill name, look in `skills/<name>/` then `.agents/skills/<name>/`. Confirm `evals.json` exists. If not, abort with an error pointing the user at `/skill-creator` (or to author `evals.json` by hand).

If `--all` (or empty), find every directory with both `SKILL.md` and `evals.json` under those two roots.

### 2. Determine the next iteration number

For each target skill, look at its nested workspace at `skills/<skill-name>/.workspace/` (or `.agents/skills/<skill-name>/.workspace/`, depending on the skill's location). If it doesn't exist, the next iteration is `1`. Otherwise scan `iteration-N/` directories and use `max(N) + 1`.

Create `skills/<skill-name>/.workspace/iteration-<N>/` (the `.workspace/` pattern is gitignored).

### 3. Dispatch each eval via the Agent tool

For every eval in `evals.json`, run **two** subagent dispatches:

#### 3a. WITHOUT skill (RED baseline)

Use the Agent tool with `subagent_type: general-purpose`. The prompt template:

```
Execute this task exactly:

[eval.prompt]

No skill is loaded for this task. After attempting it, report what you did,
what decisions you made and why, and anything you found tricky. Report
verbatim — do not polish, do not summarize. Include any code you wrote
inline so it can be analyzed.
```

Save the agent's reply (the entire response text) to:

```
skills/<skill-name>/.workspace/iteration-<N>/eval-<id>-<eval_name>/without_skill/transcript.md
```

#### 3b. WITH skill (GREEN run)

Use the Agent tool again, this time including the target skill's full SKILL.md content as system context. The prompt template:

```
Execute this task exactly:

[eval.prompt]

The skill `<skill-name>` is available — apply its rules and patterns.

After attempting it, report what you did, what decisions you made and why,
and anything you found tricky. Report verbatim — do not polish, do not
summarize. Include any code you wrote inline.

If you considered skipping any rule from the skill, capture the exact
reasoning verbatim — that's the kind of failure mode the skill needs to
catch.
```

Save the response to:

```
skills/<skill-name>/.workspace/iteration-<N>/eval-<id>-<eval_name>/with_skill/transcript.md
```

### 4. Grade each transcript

For each transcript saved, invoke `skill-tools eval` to run assertions:

```bash
node packages/skill-tools/dist/index.mjs eval <skill-name> <eval.id> \
  --variant <with_skill|without_skill> \
  --iteration <N> \
  --transcript <path-to-transcript.md>
```

This writes `grading.json` next to the transcript. Each assertion is regex / contains / file_exists — deterministic, no LLM-as-judge.

### 5. Generate the benchmark

After all evals are graded for a skill:

```bash
node packages/skill-tools/dist/index.mjs benchmark <skill-name>
```

This aggregates the grading.json files into `benchmark.json` and `benchmark.md` for that iteration.

### 6. Report

Summarize per skill:

- Which evals improved with the skill loaded vs. without
- Any evals that _failed_ with the skill loaded (regression to investigate)
- Path to the benchmark and to the latest iteration directory

Suggest the user run `pnpm skill-tools view <skill-name>` to navigate transcripts in the TUI.

## Examples

<example>
<input>"rerun the baselines for ts-best-practices"</input>
<output>
1. Resolve: skill at `skills/ts-best-practices/`, evals.json present with 3 cases.
2. Workspace: `skills/ts-best-practices/.workspace/iteration-2/` (iteration-1 already exists).
3. For each eval: dispatch Agent(general-purpose) twice (without/with skill), save transcripts.
4. Grade each transcript via skill-tools eval.
5. Aggregate via skill-tools benchmark → benchmark.md.
6. Report: "with skill 7/9 passed, without skill 3/9 — improvement on eval-1, regression on eval-2".
</output>
</example>

<example>
<input>"check for skill drift on all skills"</input>
<output>
1. --all: find every dir under skills/ + .agents/skills/ with both SKILL.md and evals.json.
2. For each: run the same 6-step workflow.
3. Aggregate report: any skills where regression count exceeds improvement count are flagged for review.
</output>
</example>

<good>
Saved transcript verbatim to:
  skills/ts-best-practices/.workspace/iteration-2/eval-0-validate-config/with_skill/transcript.md
</good>

<bad>
The agent did roughly what we expected. Skipping transcript save.
</bad>

Always save raw transcripts verbatim — paraphrasing or dropping output makes regression detection impossible.

## References

- `evals.json` schema is documented in `skills/skill-creator/references/evals-json.md`
- skill-tools CLI reference: `packages/skill-tools/`
