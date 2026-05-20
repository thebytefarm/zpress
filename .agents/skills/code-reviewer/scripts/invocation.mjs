/**
 * Pure composition of spawn arguments for a registry entry. No I/O, no
 * spawning. Exported for testing and reuse.
 *
 * The spawn target is always the absolute path of the binary (passed in by the
 * caller from locateBinary) — never the bare name from `entry.binary`. This
 * keeps the existence check and the actual spawn target identical, so a
 * confusingly-shadowed binary on $PATH cannot win at spawn time after the
 * existence check has already cleared.
 */

/**
 * Build the spawn plan for invoking a registry entry with a given prompt.
 * Prefers stdin (`stdinTemplate`) when defined; falls back to argv
 * (`promptTemplate` with `{{PROMPT}}` substitution).
 *
 * @param {object} params
 * @param {import('./registry.mjs').CliEntry} params.entry
 * @param {string} params.prompt
 * @param {string} params.absolutePath  Absolute path of the binary, from locateBinary.
 * @returns {{ mode: 'stdin' | 'argv', command: string, args: string[], stdin: string | null, usedStdin: boolean }}
 */
export function buildInvocation({ entry, prompt, absolutePath }) {
  if (entry.stdinTemplate) {
    const tokens = tokenize(entry.stdinTemplate)
    // Drop the bare command token; substitute the absolute path. tokens[0] is
    // the parent binary name from the template — discarded in favor of the
    // path that locateBinary blessed.
    const [, ...args] = tokens
    return { mode: 'stdin', command: absolutePath, args, stdin: prompt, usedStdin: true }
  }

  const tokens = tokenize(entry.promptTemplate)
  if (!tokens.includes('{{PROMPT}}')) {
    throw new Error(`promptTemplate missing {{PROMPT}}: ${entry.promptTemplate}`)
  }
  const [, ...rest] = tokens
  const args = rest.map((t) => (t === '{{PROMPT}}' ? prompt : t))
  return { mode: 'argv', command: absolutePath, args, stdin: null, usedStdin: false }
}

/**
 * Split a template into whitespace-separated tokens.
 * Exported for tests; not meant for general use.
 *
 * @param {string} template
 * @returns {string[]}
 */
export function tokenize(template) {
  return template.trim().split(/\s+/)
}
