# Parallel execution

Load when the user picked **multi-bg-agent** or **agent-team** mode — i.e. they want more than one persona's review and want them to run in parallel rather than sequentially in the current agent. Both mechanisms share 80% of the workflow (fan-out, scope sharing, merge); the only meaningful difference is the spawn primitive.

**Why bother:** sequential multi-persona review in the current agent pollutes context, slows wall-clock time, and makes findings harder to attribute. Fanning out one persona per agent keeps each lens clean and lets findings surface independently.

## Pick the spawn primitive

| Mode               | Primitive                                                                                                                                                                   | Available where                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **agent-team**     | Native team / multi-agent coordination feature (e.g. Claude Code's Teams — `TeamCreate`, `team_name` on Agent)                                                              | Claude Code; any agent that ships a first-class team primitive |
| **multi-bg-agent** | Generic background subagent / parallel task primitive (e.g. Claude Code's `Agent` tool with `run_in_background: true`, or sending multiple Agent tool calls in one message) | Most modern agent harnesses                                    |

**Recommendation:** if the host agent supports a real team primitive, prefer agent-team — it gives explicit coordination semantics and the harness handles fan-in. Otherwise use multi-bg-agent. If neither is available, fall back to in-process and tell the user the parallel mode wasn't usable.

## Step 1 — Resolve scope once, share across all agents

Compute the review scope (file paths, `git diff`, or `git diff --staged`) **once** in the parent agent. Every fanned-out agent gets the same scope — that's what makes the findings comparable.

Don't let each subagent re-resolve scope from `$ARGUMENTS`; pass concrete file paths or a captured diff string. Re-resolving in subagents introduces drift if the working tree changes mid-review.

## Step 2 — Fan out: one persona per agent

For each persona the user picked, spawn one agent with:

- The persona reference path (e.g. `references/personas/security.md`) loaded as its guiding lens
- The shared scope (file paths or captured diff)
- The output format spec from `references/review-output-format.md`
- A directive: "produce findings only, three-tier severity, one finding per line as `file:line  message`"

Each agent runs independently. They don't see each other's findings — that would defeat the point of independent lenses.

### Claude Code — multi-bg-agent

Send all spawn calls in a **single message** with multiple `Agent` tool uses (parallel execution). Use `run_in_background: true` if you want to keep working while they run; otherwise foreground is fine when their output blocks the merge.

```
Agent({
  description: "Adversarial review of src/auth/",
  subagent_type: "general-purpose",
  prompt: "<persona body from references/personas/adversarial.md>\n\nScope: src/auth/*.ts\n\nOutput format: <body of references/review-output-format.md>\n\nFindings only. No preamble, no solutions."
})
Agent({ description: "Security review of src/auth/", ... })
Agent({ description: "Architecture review of src/auth/", ... })
```

Inline the persona body and output spec into the prompt — subagents start with no context.

### Claude Code — agent-team

Use `TeamCreate` (or the user's existing team) and pass `team_name` to each `Agent` call. The team primitive gives the harness explicit grouping and shared lifecycle.

### Other agents

Map to your harness's equivalent: parallel task spawn, async subagent, worker pool. The pattern is the same — one persona per worker, shared scope, independent execution.

## Step 3 — Collect findings

Wait for all agents to finish (or use background notifications if your harness supports them). Each agent returns a review formatted per `references/review-output-format.md`:

```
SUMMARY: 7 findings (2 error / 4 warn / 1 info)

ERRORS
✗ src/auth/session.ts:47  unsigned cookie used as identity check
✗ src/auth/login.ts:122   password compared with === (timing attack)

WARNS
...
```

Capture each agent's output verbatim. Don't paraphrase before merging.

## Step 4 — Merge

Combine all reports into one. Steps:

1. **Collect** every finding from every agent. Tag each with the persona that produced it (e.g. `[security]`).
2. **Dedupe** findings that point to the same `file:line` with substantially the same message. Keep the most specific phrasing; combine persona tags (`[security|adversarial]`).
3. **Regroup by severity** (error / warn / info) — not by persona.
4. **Sort within each severity** by file path then line number.
5. **Recompute the SUMMARY line** with merged counts.

Output one combined report in the same three-tier format. Persona tags stay so the user can see which lens flagged what:

```
SUMMARY: 14 findings (3 error / 8 warn / 3 info) — merged from 3 personas

ERRORS
✗ [security|adversarial] src/auth/session.ts:47  unsigned cookie used as identity check
✗ [security]             src/auth/login.ts:122   password compared with === (timing attack)
✗ [adversarial]          src/auth/oauth.ts:88    PKCE code_verifier stored in localStorage

WARNS
⚠ [architecture] src/auth/index.ts:12  module exports leak internal helpers
⚠ [security]     src/auth/session.ts:31  session.userId can be null but isn't narrowed
...
```

## Step 5 — Attribute the run

At the top of the merged output, note which mode and which personas ran:

```
# Code review — multi-bg-agent (3 personas: adversarial, security, architecture)
```

or

```
# Code review — agent-team (4 personas)
```

This is metadata only; the body is the merged three-tier report.

## Things that go wrong

| Symptom                                               | Cause                                                   | Fix                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| One agent's report is empty or chat-style             | Persona prompt didn't push the agent into reviewer mode | Reinforce in the prompt: "Output ONLY findings in the three-tier format. No preamble."                   |
| Same finding flagged 3× by 3 personas                 | Merge step skipped or dedupe was too strict             | Dedupe by `(file, line, normalized-message-prefix)`, not by full message string                          |
| Findings from different personas contradict           | Expected — different lenses surface different concerns  | Don't collapse contradictions; let both findings show with persona tags                                  |
| One agent times out / fails                           | Harness or rate limit                                   | Surface the failure in the merged output (don't silently drop), and let the user re-run that one persona |
| Parent agent runs out of context merging huge reports | Too many agents × too much code                         | Reduce scope (per-file or per-module), or run personas in two waves                                      |

## Don't

- Don't let subagents share state or see each other's findings — kills lens independence
- Don't re-resolve scope in each subagent — pass concrete paths or a captured diff
- Don't run cross-model handoff _from_ a fanned-out agent — that's mode mixing; pick one
- Don't drop findings during merge to "trim noise" — the user asked for multi-persona; let it be loud
- Don't fall back silently to in-process if the spawn fails; tell the user
