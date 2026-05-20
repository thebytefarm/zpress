---
name: code-reviewer
description: >-
  This skill should be used when the user wants to review code, audit a
  diff, get a second opinion on changes, or run an adversarial review of
  files in the current working tree. Common triggers include "review
  this code", "audit this diff", "find issues in", "second opinion on
  this", "harsh review of", "adversarial review", and "security review
  of". Picks one or more reviewer personas (adversarial, security,
  architecture, performance). Reviews local files, `git diff`, or
  `git diff --staged` only — does not fetch external content. Runs in
  one of four modes: single-agent (one persona in the current agent),
  cross-model handoff (independent second opinion via another local AI
  CLI, with secret-shield preflight + prompt-shield wrap), multi-bg-agent
  (one persona per parallel background subagent), or agent-team
  (Claude Code Teams or equivalent on supporting agents). Skip when the
  user wants formatting fixes (use a linter) or refactoring patterns
  (use ts-best-practices or ts-best-practices-functional).

# --- Claude Code extensions (ignored by other agents) ---
argument-hint: '[<file|dir|diff|staged>]'
user-invocable: true
model-invocable: true
---

# code-reviewer

Reviews code in the current working tree through a chosen persona. Reference docs in [`references/`](references/) are loaded on demand — load only the persona and mode refs the user picks.

## When to use

Verbatim trigger phrases:

- "review this code"
- "audit this diff"
- "find issues in this"
- "second opinion on this"
- "harsh review of"
- "adversarial review"
- "security review of"

## When NOT to use

- Formatting / style fixes → use a linter (`oxlint`, `eslint`, `prettier`, etc.)
- Refactoring patterns → use `ts-best-practices` or `ts-best-practices-functional`
- Reviewing pull requests from external repos / contributors → out of scope; the skill only reviews local files. If you need PR review, run it inside a trusted CI environment after vetting the source.
- Writing new code from scratch → this skill reviews existing code

## Inputs

`$ARGUMENTS` — one of:

- File or directory path (`src/foo.ts`, `src/`)
- `diff` — review `git diff`
- `staged` — review `git diff --staged`
- Empty — ask the user what to review

## Workflow

### 1. Determine scope

Resolve `$ARGUMENTS` to a concrete set of files + diff:

| Input         | Action                                                       |
| ------------- | ------------------------------------------------------------ |
| File/dir path | Read the file(s) directly                                    |
| `diff`        | `git diff`                                                   |
| `staged`      | `git diff --staged`                                          |
| empty         | Ask: "What should I review? (file path / `diff` / `staged`)" |

### 2. Choose persona(s) — load on demand

Ask the user which review angle. In Claude Code use `AskUserQuestion` with `multiSelect: true`; in other agents use the equivalent multi-select prompt. **Always present these exact 5 options** (4 personas + an "All" convenience option):

1. **Adversarial** — devil's advocate, harsh, looks for everything wrong → load [`references/personas/adversarial.md`](references/personas/adversarial.md)
2. **Security** — threat modeling, OWASP, input handling → load [`references/personas/security.md`](references/personas/security.md)
3. **Architecture** — design, abstractions, coupling, modularity → load [`references/personas/architecture.md`](references/personas/architecture.md)
4. **Performance** — algorithmic complexity, memory, I/O patterns → load [`references/personas/performance.md`](references/personas/performance.md)
5. **All** — run every persona; loads all four refs and locks step 3 to a parallel mode

If the user picks "All", treat it as `[adversarial, security, architecture, performance]`. Don't omit the "All" option even when the user already named a persona in their request — they may want to broaden it.

Only load the references the user actually picked. Don't pre-load all four unless they chose "All" — that's the whole point of progressive disclosure.

If the user picked more than one persona, **prefer a parallel mode in step 3** (multi-bg-agent or agent-team). Sequential in-process across multiple personas is slow and pollutes context.

### 3. Choose mode

Four modes, ordered by review quality (best → worst). The reviewing agent should default to the **highest-quality option that's actually available** on the host:

| Mode                    | Quality             | Best for                                                                                                                                                                                                        | Reference                                                                |
| ----------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Cross-model handoff** | ★★★ Recommended     | Any review where bias / blind spots matter. A different model on the same machine catches what the current one missed — especially for adversarial / security / architecture lenses. Pair with `secret-shield`. | [`references/cross-model-handoff.md`](references/cross-model-handoff.md) |
| **Agent team**          | ★★ Baseline (multi) | Multi-persona parallel review when the host has a native team primitive (Claude Code Teams). Same model, but each persona gets a fresh context.                                                                 | [`references/parallel-execution.md`](references/parallel-execution.md)   |
| **Multi-bg-agent**      | ★★ Baseline (multi) | Multi-persona parallel review on agents without a team primitive. Same model, fresh contexts.                                                                                                                   | [`references/parallel-execution.md`](references/parallel-execution.md)   |
| **In-process**          | ★ Fallback only     | Last resort — same agent, same context, same model. Most biased option. Only use if no other CLI is available and parallel spawn isn't supported.                                                               | (no extra ref)                                                           |

**Why cross-model is the recommendation:** code review is an independence problem. A second model — even a smaller one — has different training data, different priors, and different blind spots, so it surfaces issues the first model rationalizes past. Same-model parallel agents (bg-agent / team) reduce context-pollution but share the model's biases. In-process review compounds both problems: same biases, same context.

**First, detect available CLIs** — this drives the recommendation:

```bash
node scripts/detect-clis.mjs --available-only --pretty
```

The script outputs JSON of available AI CLIs on `$PATH` (codex, gemini, aider, etc.).

Recommendation logic, applied in order:

1. **At least one non-current-agent CLI available → recommend cross-model handoff.** Strong default — propose it even when the user didn't explicitly say "second opinion". For multi-persona, you can either pick one CLI and run all personas through it sequentially, or (if multiple CLIs are available) split personas across CLIs.
2. **No other CLI AND ≥2 personas → recommend a parallel same-model mode.** Use **agent team** on hosts with a native team primitive (Claude Code), otherwise **multi-bg-agent**.
3. **No other CLI AND 1 persona → fall back to in-process.** Tell the user explicitly: "no second model on this machine — running same-model in-process; quality is lower".
4. **Never silently default to in-process.** If you reach in-process, it's because cross-model wasn't available and parallel modes don't apply. Say so.

Ask the user (`AskUserQuestion` or equivalent) to confirm the recommended mode before running. Load only the reference(s) for the chosen mode.

### 4. Run the review

**In-process:** apply the loaded persona reference as the guiding lens. Read the code in scope, produce findings. If multiple personas were selected and the user accepted in-process anyway, run them one at a time and merge findings using the rules in [`references/parallel-execution.md`](references/parallel-execution.md) §"Step 4 — Merge".

**Cross-model:** see [`references/cross-model-handoff.md`](references/cross-model-handoff.md) — uses the bundled `invoke-cli.mjs` with secret-shield preflight + prompt-shield wrap. Capture the child CLI's stdout verbatim as the review.

**Multi-bg-agent / Agent team:** see [`references/parallel-execution.md`](references/parallel-execution.md) — fan out one persona per agent with shared scope, collect each agent's findings, merge into one three-tier report with persona tags.

### 5. Format the output

Apply [`references/review-output-format.md`](references/review-output-format.md):

- Group findings by severity (`error` / `warn` / `info` — matches our skill-tools tiers)
- Use `file:line` references so the user can click to source
- Include a one-line summary at the top
- Reference, don't reproduce — describe the issue and point to `file:line`; do not paste code or diff lines into output (the user already has the file open)

## Examples

<example>
<input>"review the auth refactor in src/auth/" with adversarial persona</input>
<output>
1. Scope: read every file under `src/auth/`.
2. Persona: present 5 options (Adversarial, Security, Architecture, Performance, All); user picks Adversarial. Load `references/personas/adversarial.md`.
3. Mode: run `detect-clis.mjs --available-only` — `codex` is on `$PATH`. Recommend **cross-model via codex** (less biased than running adversarial in the same model). User accepts; load `references/cross-model-handoff.md`.
4. Invoke: `git diff src/auth/ | node scripts/invoke-cli.mjs codex --instructions references/personas/adversarial.md --untrusted-content - --secret-mode redact --timeout 120`. Capture stdout verbatim.
5. Present the review with a header noting the model used (`# Code review (via OpenAI Codex 0.128.0)`).
</output>
</example>

<example>
<input>"all reviews on src/auth/" — multi-persona, no other CLI on this machine</input>
<output>
1. Scope: read every file under `src/auth/`.
2. Personas: user picked "All" (option 5) — expand to `[adversarial, security, architecture, performance]`, load all four persona refs.
3. Mode: run `detect-clis.mjs --available-only` — empty. No cross-model option. Host is Claude Code, so recommend **agent team** (same-model parallel; baseline quality). User accepts; load `references/parallel-execution.md`.
4. Resolve scope once, then spawn 4 agents (one per persona) in a single message with `team_name` set. Each agent gets the persona body + scope + output-format spec inlined. Wait for all four. Merge findings: dedupe by `(file, line, normalized-message)`, regroup by severity, tag with persona.
5. Output one combined three-tier report headed `# Code review — agent-team (4 personas)`.
</output>
</example>

<example>
<input>"security review of the staged changes via codex" — cross-model second opinion</input>
<output>
1. Scope: `git diff --staged`.
2. Persona: load `references/personas/security.md`.
3. Mode: cross-model (user asked for codex). Run `node scripts/detect-clis.mjs --available-only`. Pick `codex`.
4. Invoke: pipe the diff via stdin and point `--instructions` at the persona ref already on disk. `git diff --staged | node scripts/invoke-cli.mjs codex --instructions references/personas/security.md --untrusted-content - --secret-mode redact --timeout 120`. Capture stdout.
5. Present the verbatim output with a header noting the model used.
</output>
</example>

<example>
<good>
Loaded only `references/personas/adversarial.md` because the user picked
"adversarial". Other persona refs stayed on disk. After CLI detection
landed on cross-model, loaded `cross-model-handoff.md` only;
`parallel-execution.md` stayed unloaded.
</good>

<bad>
Pre-loaded all four persona references, `cross-model-handoff.md`, and
`parallel-execution.md` "just in case". Wastes context budget on every
dispatch.
</bad>

<bad>
Defaulted to in-process for a single-persona review without first
running `detect-clis.mjs`. Cross-model is the recommended mode whenever
another CLI is available — silently picking in-process gives a more
biased review.
</bad>

The bad examples violate the skill's design: progressive disclosure (load only what's needed) and independence-by-default (prefer a different model when one is on the machine).

## Security

Cross-model mode forwards local file / diff content to a third-party AI CLI on the same machine. That crosses a trust boundary even though the source content is local: code under review can contain embedded secrets (API keys, tokens) and prompt-injection-style markers (intentionally or accidentally). Two complementary mitigations are built into `scripts/invoke-cli.mjs` and fire when the agent uses the `--instructions <file> --untrusted-content <file>` form.

**Credential exfiltration:** the script runs a regex-based secret scan on the content before composing the prompt. Default `--secret-mode scan` refuses to forward when any known secret format (AWS, GitHub, OpenAI, Anthropic, Slack, Stripe, Google API, JWT, PEM private keys) is detected. `--secret-mode redact` substitutes `[REDACTED-{type}-{n}]` placeholders. `--secret-mode allow` skips the check (use only when you've already audited the content). Source: [`scripts/secret-shield/`](scripts/secret-shield/).

**Prompt injection:** the script generates a fresh 12-hex salt per invocation and wraps the content in `<untrusted-{{salt}}>...</untrusted-{{salt}}>` with an anti-injection preamble before piping to the child CLI. Attacker-embedded closing tags (whether intentional or accidental) can't escape the wrap because they can't predict the salt. Source: [`scripts/prompt-shield/`](scripts/prompt-shield/).

In-process review, multi-bg-agent, and agent-team do not cross trust boundaries — they all run within the same agent harness on the local machine, no external sink, no preflight needed. Cross-model is the only mode where preflight applies. Background and threat model: [`contributing/prompt-injection.md`](../../contributing/prompt-injection.md).

## References

- [`references/personas/adversarial.md`](references/personas/adversarial.md) — harsh, devil's-advocate persona
- [`references/personas/security.md`](references/personas/security.md) — security-focused review lens
- [`references/personas/architecture.md`](references/personas/architecture.md) — design / coupling / modularity
- [`references/personas/performance.md`](references/personas/performance.md) — complexity, memory, I/O
- [`references/cross-model-handoff.md`](references/cross-model-handoff.md) — how to invoke detected CLIs
- [`references/parallel-execution.md`](references/parallel-execution.md) — multi-bg-agent + agent-team fan-out and merge
- [`references/review-output-format.md`](references/review-output-format.md) — three-tier output spec
- [`scripts/detect-clis.mjs`](scripts/detect-clis.mjs) — node script, ships with the skill, probes for ~20 AI CLIs and emits JSON
