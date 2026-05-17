# XML usage in SKILL.md

XML tags are an Anthropic-recommended pattern for prompts when boundaries matter. Inside SKILL.md files, this means a **selective** approach — not wrapping every section.

## Rule of thumb

| Use Markdown                                    | Use XML                                                    |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Section structure (`## Workflow`, `### Step 1`) | Example boundaries (`<example>`)                           |
| Lists, tables, code blocks                      | Contrast pairs (`<good>` / `<bad>`)                        |
| Links and references                            | Tool-call boundaries (`<input>` / `<output>`)              |
| Inline formatting                               | Anything where "where does this content end?" is ambiguous |

## Allowed XML tags

These five are the canonical set in this monorepo:

| Tag         | Use for                                                    |
| ----------- | ---------------------------------------------------------- |
| `<example>` | A complete worked scenario with input + reasoning + output |
| `<good>`    | A correctly-formed sample (description, code, etc.)        |
| `<bad>`     | An incorrectly-formed sample, paired with `<good>`         |
| `<input>`   | What the user/caller provides                              |
| `<output>`  | What the agent/tool produces                               |

Don't invent new tags. If you need one, propose adding it to this list first.

## Why selective, not everywhere

Wrapping every section in XML (`<purpose>`, `<workflow>`, `<inputs>`, etc.) was considered and rejected because:

- Markdown headings (`## ...`) are equally clear to the agent — both are unambiguous structure
- XML wrappers make the SKILL.md harder for _humans_ to edit (you, in 3 months)
- Zero of the four major public skill-creators (anthropics, skill-creator-pro, SkillForge, vercel-labs) wrap sections in XML
- Anthropic's prompt-engineering guidance recommends XML for **examples and content boundaries**, not as a global wrapper

## Patterns

### Single example

<example>
User says "build a skill for parsing TOML files". Agent runs Discover, names it `toml-parser`, RED phase, draft, lint, GREEN, package.
</example>

### Contrast pair

<good>
description: >-
  This skill should be used when the user wants to parse config files.
  Common triggers include "parse this config" and "load my settings".
</good>

<bad>
description: >-
  Helps with config files. First parse, then validate.
</bad>

### Tool-call boundary

<example>
<input>{ "tool_name": "Edit", "tool_input": { "file_path": "/x.ts" } }</input>
<output>{ "success": true }</output>
</example>

## Anti-patterns

```
<!-- ❌ Don't wrap structural sections -->
<purpose>
  Build agent skills.
</purpose>

<workflow>
  <step n="1">Discover</step>
  <step n="2">Name</step>
</workflow>

<!-- ✅ Use Markdown headings instead -->
## Purpose

Build agent skills.

## Workflow

1. Discover
2. Name
```

## Tables vs bullets

Both render fine for the agent — but tokens cost real money on every dispatch. Three-tier guideline:

- **2-column key→value tables → use bullets.** A bullet `- **key** — value` is shorter, more robust, and just as scannable. Only reach for a 2-column table if you're already using tables nearby for visual consistency.
- **3+ column tables with parallel rows → keep as tables.** The structure earns its tokens when readers need to scan a column ("which providers support feature X?") rather than read top-to-bottom. The `## Rationalization table` convention in discipline skills is the canonical example.
- **Any table whose cells contain `|` characters (regex alternation, pipes in code) → use bullets.** Markdown will parse those pipes as column separators and render the table broken. The bug is silent at authoring time (preview tools forgive it) and loud at agent-context time (the model sees malformed structure).

Token math is rough but consistent: a 2-column 8-row table runs ~3-4× the tokens of the equivalent bullet list, almost entirely from `|` padding and the `| --- |` separator row. A 3+ column table is closer to break-even because each row carries more semantic content per byte of structure.
