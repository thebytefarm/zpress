#!/usr/bin/env node
/**
 * providers — canonical list of agent-skill providers and where to find their
 * authoritative format docs.
 *
 * Zero dependencies. Pure ESM. Runs on stock Node ≥ 20 on macOS, Linux, and
 * Windows (no shell required — invoke via `node providers.mjs`, not bash).
 *
 * USAGE
 *   node providers.mjs                  # JSON to stdout (compact)
 *   node providers.mjs --pretty         # JSON pretty-printed
 *   node providers.mjs --table          # human-readable table
 *   node providers.mjs --check          # HEAD each docUrl, mark stale ones
 *   node providers.mjs --ids            # one id per line (for shell pipelines)
 *
 * As a module:
 *   import { providers, getProvider } from './providers.mjs'
 *
 * Each entry shape:
 *   {
 *     id:            kebab-case identifier
 *     name:          human-readable
 *     fileFormat:    'SKILL.md' | '.cursor/rules/*.mdc' | 'AGENTS.md' | etc.
 *     fileLocation:  where the provider expects the file to live
 *     docUrls:       prioritized list — llms.txt / llms-full.txt first, HTML last.
 *                    Used by the dev-time refresh script ONLY (skill-tools
 *                    refresh-provider-docs); never fetched at agent runtime.
 *     localDocPath:  relative path (from this file's parent skill dir) to the
 *                    bundled snapshot. The skill-portability workflow loads
 *                    THIS path — not docUrls. Snapshots are committed and
 *                    refreshed on cadence; see CONTRIBUTING.md.
 *     requiredFrontmatter: fields the loader will reject without
 *     ignoredFrontmatter:  fields the loader silently ignores (cross-agent extras)
 *     forbiddenFrontmatter: fields that BREAK loading (provider-specific to others)
 *     toolSurface:   names of built-in tools the agent can call (rough list — verify per-version)
 *     notes:         caveats, gotchas
 *   }
 *
 * Update policy: hardcoded by hand. Run `pnpm skill-tools refresh-provider-docs`
 * to refresh snapshots from upstream. Run `--check` (this script) to verify
 * docUrls still resolve. When a provider moves docs, update docUrls here, run
 * the refresh script, commit both.
 */

export const providers = [
  {
    id: 'claude-code',
    name: 'Claude Code (Anthropic)',
    fileFormat: 'SKILL.md',
    fileLocation:
      '~/.claude/skills/<name>/SKILL.md (global) or .claude/skills/<name>/SKILL.md (project) or skills/<name>/SKILL.md (via npx skills add)',
    docUrls: [
      'https://docs.claude.com/llms.txt',
      'https://docs.claude.com/en/docs/claude-code/skills',
      'https://skills.sh',
    ],
    localDocPath: 'references/providers/claude-code.md',
    requiredFrontmatter: ['name', 'description'],
    optionalFrontmatter: [
      'argument-hint',
      'user-invocable',
      'model-invocable',
      'allowed-tools',
      'metadata',
    ],
    ignoredFrontmatter: [],
    forbiddenFrontmatter: [],
    toolSurface: [
      'Read',
      'Write',
      'Edit',
      'Bash',
      'Glob',
      'Grep',
      'WebFetch',
      'WebSearch',
      'AskUserQuestion',
      'TaskCreate',
      'TaskUpdate',
      'TaskList',
      'TaskGet',
      'Agent',
      'Skill',
      'NotebookEdit',
      'ExitPlanMode',
    ],
    notes:
      'Reference implementation. Frontmatter `name` must match directory name. Description should contain "Use when" + verbatim trigger phrases.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    fileFormat: '.cursor/rules/*.mdc',
    fileLocation: '.cursor/rules/<name>.mdc — single file, NOT a directory',
    docUrls: [
      'https://docs.cursor.com/context/rules',
      'https://docs.cursor.com/llms.txt',
      'https://cursor.com/docs/context/rules-for-ai',
    ],
    localDocPath: 'references/providers/cursor.md',
    requiredFrontmatter: ['description'],
    optionalFrontmatter: ['globs', 'alwaysApply'],
    ignoredFrontmatter: ['name', 'argument-hint', 'user-invocable', 'model-invocable'],
    forbiddenFrontmatter: [],
    toolSurface: [
      'Read',
      'Edit',
      'codebase_search',
      'grep_search',
      'file_search',
      'run_terminal_cmd',
      'list_dir',
      'edit_file',
    ],
    notes:
      'Cursor uses `.mdc` rule files in `.cursor/rules/`, NOT directories with SKILL.md. Companion files (references/, templates/) do not load. Cursor-specific frontmatter: `globs` (file-pattern triggers), `alwaysApply` (boolean — load on every chat).',
  },
  {
    id: 'openai-codex-cli',
    name: 'OpenAI Codex CLI',
    fileFormat: 'AGENTS.md',
    fileLocation: '<repo-root>/AGENTS.md (or nested AGENTS.md per directory)',
    docUrls: [
      'https://github.com/openai/codex/blob/main/docs/getting-started.md',
      'https://github.com/openai/codex/blob/main/AGENTS.md',
      'https://agents.md',
    ],
    localDocPath: 'references/providers/openai-codex-cli.md',
    requiredFrontmatter: [],
    optionalFrontmatter: [],
    ignoredFrontmatter: ['name', 'description', 'argument-hint', 'globs', 'alwaysApply'],
    forbiddenFrontmatter: [],
    toolSurface: ['shell', 'apply_patch', 'web_search', 'read_file'],
    notes:
      'AGENTS.md is plain markdown — no frontmatter is read by the agent itself. Frontmatter from a SKILL.md is silently ignored. To "port" a SKILL.md you typically rename to AGENTS.md and inline the description into the body. Codex tool names differ from Claude Code (e.g., `shell` vs `Bash`, `apply_patch` vs `Edit`).',
  },
  {
    id: 'agents-skills-baseline',
    name: 'Agents-Skills Baseline (.agents/skills/)',
    fileFormat: 'SKILL.md',
    fileLocation:
      '.agents/skills/<name>/SKILL.md (project, common to all baseline-compatible agents); per-agent global paths vary (~/.gemini/skills/, ~/.config/opencode/skills/, ~/.pi/agent/skills/, ~/.agents/skills/)',
    docUrls: [
      'https://agentskills.io/specification',
      'https://skills.sh',
      'https://github.com/vercel-labs/skills',
    ],
    localDocPath: 'references/providers/agents-skills-baseline.md',
    requiredFrontmatter: ['name', 'description'],
    optionalFrontmatter: ['license', 'metadata', 'allowed-tools'],
    ignoredFrontmatter: [
      'argument-hint',
      'user-invocable',
      'model-invocable',
      'globs',
      'alwaysApply',
    ],
    forbiddenFrontmatter: [],
    toolSurface: [],
    notes:
      'Universal SKILL.md format consumed by Gemini CLI, OpenCode, Pi, and any future agent that adopts the baseline. Loads from `.agents/skills/` (project). Spec: https://agentskills.io/specification. Required: `name` (kebab-case, max 64 chars) and `description` (max 1024 chars). Unknown frontmatter silently ignored. Tool NAMES differ across consumers (Bash/run_shell_command/bash for shell, Edit/edit for edit, etc.) — portable skills should describe behavior in prose rather than reference tool names directly; that is the lowest-common-denominator contract this entry asserts. Per-agent deviations: Gemini CLI uses snake_case tools (run_shell_command, read_file, etc.) and ~/.gemini/skills/ as global path. OpenCode (SST) uses lowercase tools (bash, read, etc.) and ~/.config/opencode/skills/ as global path; docs at https://opencode.ai/docs. Pi (Earendil Works, binary `pi`) extends the baseline with: extra `.pi/skills/` location (project) + `~/.pi/agent/skills/` (global), root-level *.md discovery in those dirs, `pi.skills` entries in package.json, `--skill <path>` CLI override, and a `disable-model-invocation` optional frontmatter field; docs at https://pi.dev/docs/latest/skills.',
  },
]

/** Lookup by id. Returns undefined if not found. */
export function getProvider(id) {
  return providers.find((p) => p.id === id)
}

/** All provider ids in insertion order. */
export function ids() {
  return providers.map((p) => p.id)
}

/**
 * HEAD each docUrl with a short timeout; return per-provider freshness report.
 * Used by `--check`. Network-dependent — only invoke when explicitly asked.
 */
export async function checkFreshness({ timeoutMs = 5000 } = {}) {
  return Promise.all(
    providers.map(async (p) => {
      const urlResults = await Promise.all(
        p.docUrls.map(async (url) => {
          const ctrl = new AbortController()
          const t = setTimeout(() => ctrl.abort(), timeoutMs)
          try {
            const res = await fetch(url, {
              method: 'HEAD',
              signal: ctrl.signal,
              redirect: 'follow',
            })
            return { url, status: res.status, ok: res.ok }
          } catch (err) {
            return { url, status: 0, ok: false, error: String(err?.message ?? err) }
          } finally {
            clearTimeout(t)
          }
        })
      )
      const anyOk = urlResults.some((r) => r.ok)
      return { id: p.id, anyOk, urls: urlResults }
    })
  )
}

// ---------- CLI ----------

function renderTable(rows) {
  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'NAME' },
    { key: 'fileFormat', label: 'FORMAT' },
    { key: 'docUrl', label: 'PRIMARY DOCS' },
  ]
  const data = rows.map((p) => ({
    id: p.id,
    name: p.name,
    fileFormat: p.fileFormat,
    docUrl: p.docUrls[0] ?? '',
  }))
  const widths = cols.map((c) =>
    Math.max(c.label.length, ...data.map((r) => String(r[c.key]).length))
  )
  const line = (vals) => vals.map((v, i) => String(v).padEnd(widths[i])).join('  ')
  const out = [line(cols.map((c) => c.label)), line(widths.map((w) => '-'.repeat(w)))]
  for (const r of data) out.push(line(cols.map((c) => r[c.key])))
  return out.join('\n')
}

async function main() {
  const args = new Set(process.argv.slice(2))

  if (args.has('--ids')) {
    process.stdout.write(ids().join('\n') + '\n')
    return
  }

  if (args.has('--table')) {
    process.stdout.write(renderTable(providers) + '\n')
    return
  }

  if (args.has('--check')) {
    const report = await checkFreshness()
    const indent = args.has('--pretty') ? 2 : 0
    process.stdout.write(JSON.stringify(report, null, indent) + '\n')
    process.exit(report.every((r) => r.anyOk) ? 0 : 1)
  }

  const indent = args.has('--pretty') ? 2 : 0
  process.stdout.write(JSON.stringify(providers, null, indent) + '\n')
}

// Run main() only when invoked as a CLI, not when imported.
// pathToFileURL handles Windows backslashes and URL encoding correctly.
import { pathToFileURL } from 'node:url'
const invokedDirectly = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`providers: ${err?.stack ?? err}\n`)
    process.exit(1)
  })
}
