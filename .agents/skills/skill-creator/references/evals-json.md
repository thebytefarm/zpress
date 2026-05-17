# `evals.json` schema

The committed test-definitions file at `skills/<name>/evals.json`. Adopted from [`zwbao/skill-creator-pro`](https://github.com/zwbao/skill-creator-pro). Programmatically validated by [`packages/skill-tools/src/lib/schemas.ts`](../../../../packages/skill-tools/src/lib/schemas.ts).

## Structure

```jsonc
{
  "skill_name": "ts-best-practices", // must match the directory name
  "evals": [
    // ≥3 cases required (lint: error)
    {
      "id": 0, // unique per file, monotonic
      "eval_name": "validate-config-no-jsdoc", // kebab-case
      "prompt": "ok i need a function that validates a config object — has to check name, port, and a flag for debug. just write it real quick",
      "expected_output": "Function with *Params interface, JSDoc on the export, branded type for the config name, no `any`",
      "files": [], // optional; fixture files the prompt references
      "assertions": [
        // run against the transcript
        { "text": "uses *Params interface", "type": "regex", "pattern": "interface \\w+Params" },
        { "text": "has JSDoc @param tag", "type": "regex", "pattern": "@param" },
        { "text": "has JSDoc @returns tag", "type": "regex", "pattern": "@returns" },
      ],
    },
  ],
}
```

## Required fields

| Field                     | Notes                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `skill_name`              | Must match the directory name (`EVALS_NAME_MISMATCH` lint warns otherwise)                                                                              |
| `evals[].id`              | Integer, unique within the file; used in workspace dir naming                                                                                           |
| `evals[].eval_name`       | Kebab-case; appears in the workspace dir as `eval-<id>-<eval_name>/`                                                                                    |
| `evals[].prompt`          | The verbatim user prompt the subagent will receive. ≥10 chars. **Realistic, messy, contextual** — see [`pressure-scenarios.md`](pressure-scenarios.md). |
| `evals[].expected_output` | Plain English description of correct output. Used by humans reading transcripts; not asserted directly.                                                 |

## Optional fields

| Field                | Notes                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `evals[].files`      | Array of fixture file paths the prompt references (e.g., a sample config). Files live alongside `evals.json` and are passed to the subagent. |
| `evals[].assertions` | Deterministic checks against the transcript or output files. ≥0 (zero means: human review only).                                             |

## Assertion types

Three kinds — all deterministic. **No LLM-as-judge.**

### `regex`

```json
{ "text": "uses Result type", "type": "regex", "pattern": "Result<\\w+,\\s*\\w+>" }
```

Pattern is JS regex, run against the full transcript text. Use anchors (`^`, `$`) and `\\b` word boundaries as needed.

### `contains`

```json
{ "text": "imports zod", "type": "contains", "substring": "from 'zod'" }
```

Literal substring match (case-sensitive). Cheaper than regex when no pattern matching is needed.

### `file_exists`

```json
{ "text": "produced output file", "type": "file_exists", "path": "config.parsed.json" }
```

Checks `outputs/<path>` inside the variant directory. Useful when the scenario asks the subagent to write a file.

## Why deterministic only

LLM-as-judge assertions ("does the output convey expertise?") drift across model versions and produce noisy grading. Regex / contains / file_exists are stable: same input, same result, forever. Per `skill-creator-pro`'s guidance: "avoid LLM-as-judge assertions unless the skill is inherently subjective" — and we don't have any of those (yet).

## Writing assertions well

- **Write prompts first, assertions later.** You can only write meaningful assertions after you've imagined what "good output" looks like.
- **Make `text` descriptive.** It shows up in `grading.json` and the TUI; "uses \*Params interface" is more useful than "regex check 1".
- **Prefer structural checks.** `interface \w+Params` (shape) beats `interface ConfigParams` (specific name) — the second is brittle.
- **Avoid double-asserting.** If `regex /@param/` already checks JSDoc presence, don't also `contains "@param"`.
- **Aim for 3–5 assertions per eval.** Below 3, you're not pressuring; above 5, you're over-fitting to one phrasing.

## When `evals.json` is wrong

The lint catches:

- `EVALS_MISSING` (error) — file doesn't exist
- `EVALS_MALFORMED` (error) — file doesn't parse against the Zod schema
- `EVALS_NAME_MISMATCH` (warn) — `skill_name` doesn't match directory

Internal skills (`metadata.internal: true`) get `warn` instead of `error` for `EVALS_MISSING` — they're tooling-specific and don't always need test scaffolding.
