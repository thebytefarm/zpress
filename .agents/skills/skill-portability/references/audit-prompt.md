# Audit prompt template

The verbatim prompt the parent agent hands to each per-provider subagent in step 3 of the workflow. Copy this template, fill the `{{...}}` placeholders, and pass as the `prompt` argument to `Agent({ subagent_type: "general-purpose", ... })`.

Keep all four subagent prompts identical except for the per-provider data — the parent does the cross-provider aggregation in step 4, not the subagents.

The parent agent reads `localDocPath` for each provider with the `Read` tool BEFORE dispatching, then inlines the snapshot contents into `{{provider.snapshot}}` below. The subagent never fetches at runtime.

## Template

```
You are auditing one agent skill against the {{PROVIDER_NAME}} format.

PROVIDER METADATA (from scripts/providers.mjs):
- id:                    {{provider.id}}
- fileFormat:            {{provider.fileFormat}}
- fileLocation:          {{provider.fileLocation}}
- requiredFrontmatter:   {{provider.requiredFrontmatter}}
- optionalFrontmatter:   {{provider.optionalFrontmatter}}
- forbiddenFrontmatter:  {{provider.forbiddenFrontmatter}}
- toolSurface:           {{provider.toolSurface}}
- notes:                 {{provider.notes}}

PROVIDER DOCS (bundled snapshot from {{provider.localDocPath}}):
---
{{provider.snapshot}}
---

SKILL CONTENT TO AUDIT:
---
{{skill.frontmatter as YAML}}
---

{{skill.body as markdown}}

YOUR JOB:

1. Use the bundled provider doc snapshot above as the authoritative reference.
   Do NOT WebFetch any URL — the snapshot was committed at authoring time
   and is what this audit is grounded in. If the snapshot is empty / sparse
   / clearly incomplete (e.g. only a page title survived HTML stripping),
   lean on the PROVIDER METADATA fields instead and flag the gap in NOTES.

2. Evaluate the skill against three layers:

   a. FORMAT — does the file shape match {{provider.fileFormat}}? Are all
      requiredFrontmatter fields present? Are any forbiddenFrontmatter
      fields present? What about file-location conventions
      ({{provider.fileLocation}})?

   b. BODY — does the body lean on conventions {{provider.name}} doesn't
      parse? (Examples to look for: XML tags <example>/<good>/<bad>,
      progressive-disclosure links to references/, headings the provider
      ignores, sections referencing companion files that won't load.)

   c. TOOLS — scan the body for tool names. Match each name against the
      toolSurface above. Report unmatched tool names — these are the ones
      the agent in {{provider.name}} cannot call by that name.

3. Return ONLY this exact structure (no preamble, no markdown headings, no
   trailing prose):

   VERDICT: compatible | partial | incompatible
   FORMAT: <one-line summary of format-layer findings>
   BODY: <one-line summary of body-layer findings>
   TOOLS: <comma-separated unmatched tool names, or "none">
   NOTES: <2–3 short bullets with specific findings; cite frontmatter field
          names or quote phrases from the body where useful>

VERDICT scoring rubric:
- "compatible"   = format matches, body parses cleanly, all named tools
                   exist in toolSurface
- "partial"      = format works after a rename or one frontmatter tweak,
                   OR body has some non-portable structure, OR 1–2 tool
                   names are unmatched but their function is achievable
- "incompatible" = required frontmatter missing, format mismatch needs
                   substantive rewrite, OR core workflow tools are absent
                   from this provider's surface
```

## Worked example — Cursor verdict on the code-reviewer skill

Hypothetical filled-in prompt → hypothetical subagent return:

```
VERDICT: partial
FORMAT: SKILL.md must be renamed to .cursor/rules/code-reviewer.mdc; the
        references/ directory will not load — those reference docs reach
        Claude Code via lazy load, but Cursor reads only the single .mdc.
BODY: <example> tags render as fenced code in Cursor's chat panel rather
      than being parsed as structure. Acceptable but not load-bearing.
TOOLS: AskUserQuestion
NOTES:
- Frontmatter `argument-hint`, `user-invocable`, `model-invocable` are
  silently ignored by Cursor — harmless.
- The "load on demand" persona-reference pattern doesn't survive the
  port. Inline at least one persona before shipping to Cursor users.
- Cursor lacks `AskUserQuestion`; replace with a chat prompt the user
  answers free-form.
```
