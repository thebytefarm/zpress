/**
 * Pure data + lookup. No I/O. No process spawning. Importable from anywhere
 * (build tooling, tests, generated docs) without a node:fs / node:child_process
 * footprint.
 *
 * Add a new entry here to grow coverage; the probe (./probe.mjs) and the
 * invocation builder (./invocation.mjs) are structurally generic and pick the
 * new entry up automatically.
 *
 * @typedef {object} CliEntry
 * @property {string} id          Stable identifier, kebab-case (matches skills.sh agent id when possible)
 * @property {string} name        Human-readable
 * @property {string} binary      Executable name to look for on $PATH
 * @property {string} promptTemplate  How to invoke for a one-shot prompt; uses {{PROMPT}} placeholder
 * @property {string|null} stdinTemplate  Alternative: command that reads prompt from stdin (preferred when set)
 * @property {string=} versionFlag        Flag to ask for version; defaults to --version
 * @property {string=} notes
 * @property {boolean=} subcommand        true if `binary` is a parent + subcommand (e.g., `gh copilot`)
 * @property {string=} subcommandCheck    For subcommands, the full check command (e.g., `gh extension list`)
 * @property {string=} subcommandMatch    Substring expected in subcommandCheck output; defaults to entry.id
 * @property {string[]=} requiredEnv      Env vars the child must inherit (e.g. API keys). Empty = none.
 *                                        Omitted = TODO; treat as fail-closed (no inheritance).
 */

/** @type {CliEntry[]} */
export const REGISTRY = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    binary: 'claude',
    promptTemplate: 'claude -p {{PROMPT}}',
    stdinTemplate: 'claude -p',
    requiredEnv: ['ANTHROPIC_API_KEY'],
    notes: 'Anthropic Claude Code CLI; -p runs one-shot non-interactive',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    binary: 'codex',
    promptTemplate: 'codex exec {{PROMPT}}',
    stdinTemplate: 'codex exec -',
    requiredEnv: ['OPENAI_API_KEY'],
    notes: 'OpenAI Codex CLI; `codex exec` runs non-interactive',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    binary: 'gemini',
    promptTemplate: 'gemini -p {{PROMPT}}',
    stdinTemplate: 'gemini -p',
    requiredEnv: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    notes: 'Google Gemini CLI; -p runs one-shot',
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    binary: 'opencode',
    promptTemplate: 'opencode run {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm which provider env(s) opencode actually reads.
    requiredEnv: [],
    notes: 'OpenCode CLI; `opencode run` for non-interactive prompts',
  },
  {
    id: 'cursor-agent',
    name: 'Cursor agent',
    binary: 'cursor-agent',
    promptTemplate: 'cursor-agent -p {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Cursor agent env contract.
    requiredEnv: [],
    notes: 'Cursor CLI agent (separate from the IDE)',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    binary: 'gh',
    subcommand: true,
    subcommandCheck: 'gh extension list',
    subcommandMatch: 'copilot',
    promptTemplate: 'gh copilot explain {{PROMPT}}',
    stdinTemplate: null,
    versionFlag: '--version',
    requiredEnv: ['GITHUB_TOKEN', 'GH_TOKEN'],
    notes: 'gh copilot extension; check with `gh extension list | grep copilot`',
  },
  {
    id: 'aider',
    name: 'Aider',
    binary: 'aider',
    promptTemplate: 'aider --message {{PROMPT}}',
    stdinTemplate: null,
    // Aider supports many providers; common ones listed.
    requiredEnv: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    notes: 'AI pair-programming CLI; --message for one-shot',
  },
  {
    id: 'crush',
    name: 'Crush',
    binary: 'crush',
    promptTemplate: 'crush -p {{PROMPT}}',
    stdinTemplate: 'crush -p',
    // TODO: confirm Crush env contract.
    requiredEnv: [],
    notes: 'Charm Crush — terminal AI assistant',
  },
  {
    id: 'mods',
    name: 'Mods',
    binary: 'mods',
    promptTemplate: 'mods {{PROMPT}}',
    stdinTemplate: 'mods',
    // Mods supports many providers; common ones listed.
    requiredEnv: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    notes: 'Charm Mods — pipes prompts to LLMs',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    binary: 'ollama',
    promptTemplate: 'ollama run llama3 {{PROMPT}}',
    stdinTemplate: 'ollama run llama3',
    // Local model runner — no API keys required.
    requiredEnv: [],
    notes: 'Local model runner; substitute the model name as needed',
  },
  {
    id: 'goose',
    name: 'Goose',
    binary: 'goose',
    promptTemplate: 'goose run -t {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Goose env contract.
    requiredEnv: [],
    notes: 'Block Goose — agentic CLI',
  },
  {
    id: 'continue',
    name: 'Continue',
    binary: 'continue',
    promptTemplate: 'continue chat {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Continue env contract.
    requiredEnv: [],
    notes: 'Continue CLI / dev agent',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    binary: 'windsurf',
    promptTemplate: 'windsurf -p {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Windsurf env contract.
    requiredEnv: [],
    notes: 'Codeium Windsurf CLI',
  },
  {
    id: 'droid',
    name: 'Droid (Factory)',
    binary: 'droid',
    promptTemplate: 'droid run {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Droid env contract.
    requiredEnv: [],
    notes: 'Factory Droid CLI',
  },
  {
    id: 'tabnine-cli',
    name: 'Tabnine CLI',
    binary: 'tabnine',
    promptTemplate: 'tabnine ask {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Tabnine env contract.
    requiredEnv: [],
  },
  {
    id: 'amp',
    name: 'Amp',
    binary: 'amp',
    promptTemplate: 'amp run {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Amp env contract.
    requiredEnv: [],
    notes: 'Sourcegraph Amp CLI',
  },
  {
    id: 'qwen-code',
    name: 'Qwen Code',
    binary: 'qwen-code',
    promptTemplate: 'qwen-code -p {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Qwen Code env contract.
    requiredEnv: [],
  },
  {
    id: 'iflow-cli',
    name: 'iFlow CLI',
    binary: 'iflow',
    promptTemplate: 'iflow -p {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm iFlow env contract.
    requiredEnv: [],
  },
  {
    id: 'kimi-cli',
    name: 'Kimi Code CLI',
    binary: 'kimi',
    promptTemplate: 'kimi -p {{PROMPT}}',
    stdinTemplate: null,
    // TODO: confirm Kimi env contract.
    requiredEnv: [],
  },
  {
    id: 'aichat',
    name: 'aichat',
    binary: 'aichat',
    promptTemplate: 'aichat {{PROMPT}}',
    stdinTemplate: 'aichat',
    // Polyglot — common provider keys listed.
    requiredEnv: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    notes: 'Polyglot CLI — supports many providers; useful as a fallback',
  },
]

/**
 * Look up a CliEntry by id. Returns null if not found.
 *
 * @param {string} id
 * @returns {CliEntry | null}
 */
export function findEntry(id) {
  return REGISTRY.find((e) => e.id === id) ?? null
}
