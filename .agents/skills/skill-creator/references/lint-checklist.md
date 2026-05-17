# Self-lint checklist

Run with `pnpm skill-tools lint <name>` (or `pnpm skill-tools lint` for all skills). The TS implementation in [`packages/skill-tools/src/lib/lint.ts`](../../../../packages/skill-tools/src/lib/lint.ts) is the enforcer; this doc is the human-readable reference.

## Severity model

| Severity | Action                               | Exit code on hit |
| -------- | ------------------------------------ | ---------------- |
| `error`  | Block: fix before shipping           | 2                |
| `warn`   | Likely problem; fix unless justified | 0                |
| `info`   | Recommendation; apply if cheap       | 0                |

`pnpm skill-tools lint` shows all three by default. Use `--severity error` to filter to blockers only, or `--fix` to print fix hints alongside each finding.

## Rules

### Naming

| Code       | Severity | What it checks                                                                                     |
| ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| `DIR_NAME` | error    | Directory matches `^[a-z][a-z0-9-]+[a-z0-9]$` (kebab-case, no double hyphens, no leading/trailing) |

→ See [`naming.md`](naming.md)

### Frontmatter

| Code                         | Severity | What it checks                                                           |
| ---------------------------- | -------- | ------------------------------------------------------------------------ |
| `FM_MISSING_NAME`            | error    | Frontmatter has `name`                                                   |
| `FM_NAME_MISMATCH`           | error    | `name` matches directory                                                 |
| `FM_MISSING_DESCRIPTION`     | error    | Frontmatter has `description`                                            |
| `FM_MISSING_ARGUMENT_HINT`   | info     | `argument-hint` set (Claude Code extension; recommended for cross-agent) |
| `FM_MISSING_USER_INVOCABLE`  | info     | `user-invocable` set (Claude Code extension)                             |
| `FM_MISSING_MODEL_INVOCABLE` | info     | `model-invocable` set (Claude Code extension)                            |

→ See [`frontmatter.md`](frontmatter.md)

### Description

| Code                 | Severity | What it checks                                                       |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `DESC_TOO_SHORT`     | warn     | ≥ 80 chars                                                           |
| `DESC_TOO_LONG`      | warn     | ≤ 1024 chars                                                         |
| `DESC_NO_TRIGGER`    | warn     | Contains "Use when" or "should be used when"                         |
| `DESC_FEW_TRIGGERS`  | warn     | ≥ 3 verbatim trigger phrases in double quotes                        |
| `DESC_ANTI_SHORTCUT` | error    | No anti-shortcut words: `then`, `next`, `step 1`, `process`, `first` |
| `DESC_NO_SKIP`       | info     | Has "Skip when" / "do not use when" / "avoid when" clause            |

→ See [`description.md`](description.md)

### Body

| Code                | Severity | What it checks                                                                        |
| ------------------- | -------- | ------------------------------------------------------------------------------------- |
| `BODY_TOO_LONG`     | warn     | ≤ 500 lines                                                                           |
| `BODY_FEW_SECTIONS` | warn     | ≥ 3 `## ` headings                                                                    |
| `BODY_TODO`         | error    | No `TODO` / `FIXME` / `XXX` placeholders (excluding code blocks and inline backticks) |
| `BODY_NO_EXAMPLE`   | warn     | At least one `<example>...</example>` block                                           |

→ See [`xml-usage.md`](xml-usage.md)

### Companions

| Code         | Severity | What it checks      |
| ------------ | -------- | ------------------- |
| `NO_README`  | info     | `README.md` present |
| `NO_LICENSE` | info     | `LICENSE` present   |

### Evals

| Code                  | Severity                                   | What it checks                                 |
| --------------------- | ------------------------------------------ | ---------------------------------------------- |
| `EVALS_MISSING`       | error (warn for `metadata.internal: true`) | `evals.json` exists with ≥ 3 cases             |
| `EVALS_MALFORMED`     | error                                      | `evals.json` parses against the Zod schema     |
| `EVALS_NAME_MISMATCH` | warn                                       | `skill_name` in `evals.json` matches directory |

→ See [`evals-json.md`](evals-json.md), [`tdd-for-skills.md`](tdd-for-skills.md), [`pressure-scenarios.md`](pressure-scenarios.md)

## CI usage

```bash
pnpm skill-tools lint                   # all skills, all severities
pnpm skill-tools lint --severity error  # only blockers
pnpm skill-tools lint <skill-name>      # one skill
pnpm skill-tools lint --fix             # show fix hints
```

Exit code is `2` if any `error` was found, `0` otherwise. Wire `pnpm skill-tools lint --severity error` into pre-commit / CI to block bad skills.

## Disabling a check

If a check is genuinely wrong for a skill, **don't silence it** — fix the rule. Either:

1. Open an issue / PR against `lint.ts` to relax the check.
2. Add a specific justification comment in `SKILL.md` so future maintainers understand.

Silencing lint without a documented reason is the same anti-pattern as "disable this test to make the build pass".
