# code-reviewer

> Review code in the current working tree through a chosen reviewer persona — adversarial, security, architecture, or performance. Optionally hand the review off to another AI CLI on the local machine for an independent cross-model second opinion.

Reviews local files, `git diff`, or `git diff --staged` only — never fetches external content. **Cross-model handoff is the recommended default** when another AI CLI is available on the machine — a different model finds issues the current one rationalizes past. In-process review is a fallback for when no second CLI is present.

## Install

```bash
npx skills add zrosenbauer/skills --skill code-reviewer
```

## What it does

- Asks the user which review angle (adversarial / security / architecture / performance / all), multi-select, loads only the picked references (progressive disclosure)
- Reads the in-scope files / diff from the local working tree
- Probes `$PATH` for ~20 known AI CLIs (Codex, Gemini, Aider, Cursor agent, Crush, Mods, Ollama, Goose, Continue, Windsurf, Droid, Tabnine, Amp, Qwen Code, iFlow, Kimi, aichat, gh copilot, etc.) and **recommends cross-model handoff** when one is available — a different model on the same machine catches what the current one misses
- Falls back to multi-bg-agent / agent-team for multi-persona parallel review when cross-model isn't viable; falls back to in-process only as a last resort
- Outputs findings in three-tier severity (error / warn / info) matching the repo's `skill-tools` lint format

## Personas

| Persona      | When to use                                                             | Reference                                                                    |
| ------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Adversarial  | Default for "harsh review", devil's advocate, before-merge sanity check | [`references/personas/adversarial.md`](references/personas/adversarial.md)   |
| Security     | Threat-model the code; OWASP / CWE categories                           | [`references/personas/security.md`](references/personas/security.md)         |
| Architecture | Boundaries, coupling, change locality, dependency direction             | [`references/personas/architecture.md`](references/personas/architecture.md) |
| Performance  | Algorithmic complexity, I/O patterns, GC pressure                       | [`references/personas/performance.md`](references/personas/performance.md)   |

## Trigger phrases

- "review this code"
- "audit this diff"
- "find issues in this"
- "second opinion on this"
- "harsh review of"
- "adversarial review"
- "security review of"

## Cross-model handoff (recommended default)

The skill probes for available AI CLIs at the start of every review. If at least one non-current-agent CLI is on `$PATH`, cross-model is the recommended mode — code review is an independence problem, and a second model surfaces issues the first one rationalizes past.

```bash
node scripts/detect-clis.mjs --available-only --pretty
```

Then dispatches via `scripts/invoke-cli.mjs`, which runs a **secret-shield preflight** (refuses to forward known secret formats by default) and **prompt-shield salted-tag wrap** (anti-injection delimiter) before invoking the chosen CLI. See [`references/cross-model-handoff.md`](references/cross-model-handoff.md) for the full invocation pattern.

## Out of scope

- Reviewing pull requests from external repos / contributors. Run that inside a trusted CI environment after vetting the source.

## License

[MIT](./LICENSE) © Zac Rosenbauer
