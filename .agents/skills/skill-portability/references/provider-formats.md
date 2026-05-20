# Provider formats — deep dive

The audit subagents use this to ground their verdicts. The structured data lives in [`../scripts/providers.mjs`](../scripts/providers.mjs); this doc explains the _why_ behind each entry. When a finding is ambiguous, defer to the live provider docs at the URLs in the script — those are authoritative.

## Claude Code (Anthropic)

**Format**: `SKILL.md` inside a directory.

**File location**: `.claude/skills/<name>/SKILL.md` (local) or `skills/<name>/SKILL.md` (when installed via `npx skills add zrosenbauer/skills`). The directory name MUST match the `name` field in frontmatter.

**Required frontmatter**: `name`, `description`. The `skills` CLI rejects skills missing either.

**Optional frontmatter**: `argument-hint`, `user-invocable`, `model-invocable`, `allowed-tools`, `metadata`.

**Tool surface** (built-in tools the agent can call by name): `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `AskUserQuestion`, `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`, `Agent`, `Skill`, `NotebookEdit`, `ExitPlanMode`. Verify against the model version — the surface evolves.

**Common gotchas**:

- The `name` field MUST be kebab-case and exactly match the directory name. Mismatch → `FM_NAME_MISMATCH` lint error in this monorepo.
- Description must contain `"Use when"` or `"This skill should be used when"` plus ≥3 verbatim trigger phrases in double quotes.
- XML tags inside markdown sections (`<example>`, `<good>`, `<bad>`) are first-class — Claude reads them. Other providers may strip or ignore them.

## Cursor

**Format**: `.mdc` rule file (single file, NOT a directory).

**File location**: `.cursor/rules/<name>.mdc`. Companion files (`references/`, `templates/`, `scripts/`) sitting next to the rule do NOT load — Cursor only reads the single `.mdc` file. Skills with progressive-disclosure references will lose half their content when ported.

**Required frontmatter**: `description`. (Cursor doesn't enforce `name` — the filename serves as the identifier.)

**Optional frontmatter**: `globs` (file-pattern triggers — rule loads when matching files are open), `alwaysApply` (boolean — load on every chat regardless of context).

**Forbidden frontmatter**: none — unknown fields are ignored, but the loader won't honor them.

**Tool surface**: `Read`, `Edit`, `codebase_search`, `grep_search`, `file_search`, `run_terminal_cmd`, `list_dir`, `edit_file`. Different naming convention from Claude Code (snake_case, no `Bash`/`Glob`/`Grep` exact matches).

**Common gotchas**:

- A SKILL.md with `references/foo.md` linked from the body will lose those references on port — inline the critical bits before renaming to `.mdc`.
- `globs` is the canonical Cursor trigger mechanism — the description-based dispatcher matters less here.
- XML inside markdown is rendered as code in the chat panel; not parsed.

## OpenAI Codex CLI

**Format**: `AGENTS.md` plain markdown.

**File location**: `<repo-root>/AGENTS.md` (or nested `AGENTS.md` per directory — Codex reads the closest one walking up from the cwd).

**Required frontmatter**: none. Codex treats AGENTS.md as plain markdown — frontmatter is silently ignored if present.

**Optional frontmatter**: none honored. (Frontmatter is not part of the AGENTS.md spec.)

**Tool surface**: `shell` (NOT `Bash`), `apply_patch` (NOT `Edit`), `web_search`, `read_file`. Tool names diverge significantly from Claude Code — a skill body that says "use `Bash` to run X" reads as gibberish to Codex.

**Common gotchas**:

- A SKILL.md with rich frontmatter (`argument-hint`, `user-invocable`, etc.) "ports" to AGENTS.md by inlining the description into the body and dropping all frontmatter — Codex ignores it anyway, but leaving it in adds noise.
- The AGENTS.md spec is at <https://agents.md/> — provider-agnostic in principle, but Codex's tool surface is what determines behavior.
- Multiple nested `AGENTS.md` files compose hierarchically — useful when porting a single skill into a multi-package repo.

## Continue.dev

**Format**: `.md` (rules) or `.yaml` (custom agents).

**File location**: `.continue/rules/<name>.md` for rules; `.continue/agents/<name>.yaml` for custom agents with their own model + tool config.

**Required frontmatter**: none.

**Optional frontmatter**: `name`, `description`, `globs`. Other fields are silently ignored.

**Tool surface**: `read_file`, `edit_file`, `run_terminal`, `search_codebase`. Smaller surface than Claude Code; no built-in `AskUserQuestion` equivalent — interactive questions need a custom agent.

**Common gotchas**:

- Rules and agents are different file types — most skills port to _rules_; only complex multi-step workflows justify the agent YAML.
- `globs` works the same way as Cursor — file-pattern triggers.
- XML tags inside markdown are passed to the model as-is; Continue doesn't pre-process them.

## Cross-cutting porting checklist

Before claiming a skill is "portable":

1. **Frontmatter**: does it use only universally-required fields (`name`, `description`)?
2. **Body**: does it avoid XML tags as load-bearing structure? (Use `<example>` for _display_, not for _parsing_.)
3. **Tool names**: does it phrase actions in terms of _capabilities_ ("read the file", "ask the user") rather than tool names (`Read`, `AskUserQuestion`)?
4. **References**: does it work as a single file? If not, the bits behind `references/` won't reach Cursor or single-file providers.
5. **File location**: is the user expected to run `npx skills add` (Claude Code) vs hand-copy to `.cursor/rules/` (Cursor)? Document the install path.
