# Naming rules

## Hard rules

| Rule       | Regex / check                                                                |
| ---------- | ---------------------------------------------------------------------------- |
| Must match | `^[a-z][a-z0-9-]+[a-z0-9]$`                                                  |
| Length     | ≤ 64 characters                                                              |
| Case       | `kebab-case` only — no camelCase, no snake_case, no PascalCase               |
| Hyphens    | Single hyphens between words. No double hyphens (`--`). No leading/trailing. |
| Characters | `a-z`, `0-9`, `-` only. No underscores, dots, or unicode.                    |

## Patterns to prefer

| Pattern            | Example                                       | When                                |
| ------------------ | --------------------------------------------- | ----------------------------------- |
| `<domain>-<focus>` | `ts-best-practices`, `react-state-management` | Most skills — clearest intent       |
| `<verb>-<noun>`    | `audit-skills`, `parse-toml`                  | Action-oriented utilities           |
| `<scope>-<thing>`  | `gh-issue-triage`, `gg-plan`                  | Skill families with a shared prefix |

## Patterns to avoid

| Bad                                   | Why                        | Better                                      |
| ------------------------------------- | -------------------------- | ------------------------------------------- |
| `bestpractices`                       | Run-on word, hard to read  | `best-practices`                            |
| `tsBestPractices`                     | camelCase                  | `ts-best-practices`                         |
| `ts_best_practices`                   | snake_case                 | `ts-best-practices`                         |
| `the-typescript-best-practices-skill` | Verbose, redundant "skill" | `ts-best-practices`                         |
| `skill1`, `temp`, `new-skill`         | Non-descriptive            | Pick something specific                     |
| `claude-skill-X`                      | Agent-specific prefix      | Skills are agent-agnostic — drop the prefix |

## Industry conventions

Most-installed skills on skills.sh use `<domain>-<focus>` with hyphens:

- `react-best-practices` (vercel-labs)
- `typescript-advanced-types` (wshobson)
- `nodejs-backend-patterns` (wshobson)

Avoid generic suffixes like `-rules`, `-style`, `-conventions` unless they add real specificity. `-best-practices` and `-patterns` are widely understood.

## Length sanity check

If the name needs > 4 hyphenated words, the skill is probably trying to do too much. Consider splitting into two skills or picking a tighter scope.
