#!/usr/bin/env node
// Imports from ./prompt-shield/ and ./secret-shield/ are vendored copies synced
// from skill-scripts/. Run `pnpm skill-tools sync-scripts` if these are missing.
/**
 * invoke-cli — invoke a registered AI CLI with a prompt.
 *
 * Two input modes:
 *
 *   1. Verbatim stdin (no flags) — for trusted-only prompts:
 *        echo "review this code" | invoke-cli.mjs codex
 *
 *   2. Wrapped composition (--instructions + --untrusted-content) — for
 *      forwarding third-party content (PR diffs, scraped pages, issue bodies)
 *      to the child CLI. Either flag accepts a file path or `-` to read
 *      from stdin (only one of the two flags may be `-` per invocation).
 *      The script:
 *
 *        1. Runs secret-shield on the untrusted content. Default
 *           --secret-mode=scan refuses to forward if any known secret is
 *           detected. --secret-mode=redact replaces matches with
 *           [REDACTED-{type}-{n}] placeholders. --secret-mode=allow skips.
 *        2. Composes the final prompt:
 *
 *             <instructions verbatim>
 *
 *             <anti-injection preamble naming the salted tag>
 *
 *             <untrusted-{{salt}}>
 *             <untrusted content (possibly redacted)>
 *             </untrusted-{{salt}}>
 *
 *           The salt is fresh per-invocation, so attacker-embedded closing
 *           tags cannot escape the wrap.
 *
 *      Together these mitigate W011 (indirect prompt injection — handled by
 *      the wrap) and W007 (credential exfiltration — handled by the
 *      secret-shield preflight). See contributing/prompt-injection.md.
 *
 * Usage:
 *   node invoke-cli.mjs <cli-id> [--timeout <seconds>] [--dry-run]
 *   node invoke-cli.mjs <cli-id> --instructions <file> --untrusted-content <file> \
 *        [--secret-mode scan|redact|allow] [...]
 *
 * Exit codes:
 *   0  — child exited 0
 *   1  — argument error, missing file, or secrets detected with --secret-mode=scan
 *   2  — child exited non-zero
 *   3  — timeout
 *   4  — child binary not on $PATH
 *
 * Examples:
 *   echo "review this code" | node invoke-cli.mjs codex
 *   node invoke-cli.mjs codex --instructions persona.md --untrusted-content diff.txt
 *   git diff --staged | node invoke-cli.mjs codex --instructions persona.md --untrusted-content -
 *   node invoke-cli.mjs codex --instructions p.md --untrusted-content d.txt --dry-run
 *   node invoke-cli.mjs codex -i p.md -u d.txt --secret-mode redact
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { buildInvocation } from './invocation.mjs'
import { locateBinary } from './probe.mjs'
import { composeWrappedPrompt } from './prompt-shield/compose.mjs'
import { findEntry } from './registry.mjs'
import { redactSecrets, scanForSecrets } from './secret-shield/scan.mjs'

const argv = process.argv.slice(2)
const cliId = argv[0]
const flags = parseFlags(argv.slice(1))

if (!cliId || cliId.startsWith('--')) {
  process.stderr.write(
    'Usage: invoke-cli <cli-id> [--timeout <s>] [--dry-run]\n' +
      '       invoke-cli <cli-id> --instructions <file> --untrusted-content <file> [--secret-mode scan|redact|allow]\n'
  )
  process.exit(1)
}

const entry = findEntry(cliId)
if (!entry) {
  process.stderr.write(`Unknown cli-id: ${cliId}\n`)
  process.stderr.write('Run `node detect-clis.mjs --names-only` to see available ids.\n')
  process.exit(1)
}

const composition = composePrompt(flags)
const prompt = composition.prompt

if (!prompt.trim()) {
  process.stderr.write(
    'Empty prompt. Pipe via stdin or pass --instructions <file> --untrusted-content <file>\n'
  )
  process.exit(1)
}

// Resolve binary up front — both the existence check and the spawn target
// must agree on the same absolute path. Skipped in dry-run because the dry-run
// plan is deterministic and meant to work without the binary installed.
let absolutePath = entry.binary
if (!flags.dryRun) {
  const located = locateBinary(entry.binary)
  if (!located.available) {
    process.stderr.write(`${entry.binary} not found on $PATH\n`)
    process.exit(4)
  }
  absolutePath = located.path
}

const plan = buildInvocation({ entry, prompt, absolutePath })

if (flags.dryRun) {
  process.stdout.write(
    JSON.stringify(
      {
        cli: { id: entry.id, name: entry.name, binary: entry.binary },
        mode: plan.mode,
        command: plan.command,
        args: plan.args,
        stdinBytes: plan.stdin === null ? 0 : Buffer.byteLength(plan.stdin),
        wrapped: composition.wrapped,
        wrappedSalt: composition.salt ?? null,
        secretMode: composition.secretMode,
        secretsRedacted: composition.secretsRedacted,
      },
      null,
      2
    ) + '\n'
  )
  process.exit(0)
}

// argv-mode CLIs receive the prompt on the command line, where it shows up in
// `ps -ef`. If the prompt was composed with --untrusted-content we warn —
// untrusted content + process-list visibility is the worst combo.
if (!plan.usedStdin && composition.wrapped) {
  process.stderr.write(
    `[invoke-cli] WARN: ${entry.id} does not accept stdin; prompt (incl. untrusted content) ` +
      'will be visible in process list. Consider a stdin-capable CLI for sensitive content.\n'
  )
}

const result = spawnSync(plan.command, plan.args, {
  input: plan.stdin ?? undefined,
  encoding: 'utf8',
  timeout: flags.timeout * 1000,
  stdio: ['pipe', 'pipe', 'pipe'],
  maxBuffer: 50 * 1024 * 1024,
  // Fail-closed env allowlist: PATH/HOME/etc + per-entry requiredEnv keys.
  // No requiredEnv on the entry => nothing extra forwarded (treated as TODO).
  env: buildChildEnv(entry, process.env),
})

if (result.error?.code === 'ETIMEDOUT') {
  process.stderr.write(`invoke-cli: timed out after ${flags.timeout}s\n`)
  process.exit(3)
}
if (result.error) {
  process.stderr.write(`invoke-cli: ${result.error.message}\n`)
  process.exit(2)
}

process.stdout.write(result.stdout ?? '')
if (result.stderr) process.stderr.write(result.stderr)
process.exit(result.status === 0 ? 0 : 2)

/**
 * Resolve the prompt from either flags (composed + wrapped + scrubbed) or
 * stdin (verbatim). Applies secret-shield preflight when --untrusted-content
 * is present (default scan mode).
 *
 * @param {ReturnType<typeof parseFlags>} f
 * @returns {{ prompt: string, wrapped: boolean, salt: string | null, secretMode: string, secretsRedacted: number }}
 */
function composePrompt(f) {
  if (f.untrustedContent && !f.instructions) {
    process.stderr.write('--untrusted-content requires --instructions\n')
    process.exit(1)
  }

  if (f.instructions === '-' && f.untrustedContent === '-') {
    process.stderr.write("Cannot use '-' (stdin) for both --instructions and --untrusted-content\n")
    process.exit(1)
  }

  const stdinHolder = { cached: null, consumed: false }

  if (f.instructions && f.untrustedContent) {
    const instructions = readSource(f.instructions, '--instructions', stdinHolder)
    let untrusted = readSource(f.untrustedContent, '--untrusted-content', stdinHolder)
    let secretsRedacted = 0

    if (f.secretMode !== 'allow') {
      const { findings, hasFindings } = scanForSecrets({ content: untrusted })
      if (hasFindings) {
        if (f.secretMode === 'scan') {
          process.stderr.write(
            `Aborted: ${findings.length} secret(s) detected in --untrusted-content.\n` +
              'Use --secret-mode redact to scrub, or --secret-mode allow to forward verbatim.\n'
          )
          for (const fnd of findings) {
            process.stderr.write(
              `  ${fnd.severity}\t${fnd.id}\tline ${fnd.line}, col ${fnd.column}\n`
            )
          }
          process.exit(1)
        }
        if (f.secretMode === 'redact') {
          const redacted = redactSecrets({ content: untrusted })
          untrusted = redacted.content
          secretsRedacted = redacted.findings.length
        }
      }
    }

    const composed = composeWrappedPrompt({ instructions, untrusted })
    return {
      prompt: composed.prompt,
      wrapped: true,
      salt: composed.salt,
      secretMode: f.secretMode,
      secretsRedacted,
    }
  }

  if (f.instructions) {
    return {
      prompt: readSource(f.instructions, '--instructions', stdinHolder),
      wrapped: false,
      salt: null,
      secretMode: 'allow',
      secretsRedacted: 0,
    }
  }

  return {
    prompt: readStdin(),
    wrapped: false,
    salt: null,
    secretMode: 'allow',
    secretsRedacted: 0,
  }
}

/**
 * Resolve a flag value to file content, or read from stdin if the value is `-`.
 * Stdin can only be consumed once per invocation; subsequent `-` triggers an error.
 *
 * @param {string} source — file path or `-`
 * @param {string} flagName
 * @param {{ cached: string | null, consumed: boolean }} stdinHolder
 * @returns {string}
 */
function readSource(source, flagName, stdinHolder) {
  if (source !== '-') return readFileOrExit(source, flagName)
  if (stdinHolder.consumed) {
    process.stderr.write(`Cannot use '-' (stdin) for both --instructions and --untrusted-content\n`)
    process.exit(1)
  }
  stdinHolder.consumed = true
  if (stdinHolder.cached === null) stdinHolder.cached = readStdin()
  return stdinHolder.cached
}

/**
 * @param {string} filePath
 * @param {string} flagName
 * @returns {string}
 */
function readFileOrExit(filePath, flagName) {
  if (!existsSync(filePath)) {
    process.stderr.write(`${flagName} file not found: ${filePath}\n`)
    process.exit(1)
  }
  return readFileSync(filePath, 'utf8')
}

/** @param {string[]} rest */
function parseFlags(rest) {
  let timeout = 120
  let dryRun = false
  let instructions = null
  let untrustedContent = null
  let secretMode = 'scan'
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i]
    if (a === '--dry-run') {
      dryRun = true
      continue
    }
    if (a === '--timeout') {
      const next = rest[i + 1]
      const n = Number(next)
      if (!Number.isFinite(n) || n <= 0) {
        process.stderr.write(`--timeout requires a positive number; got: ${next}\n`)
        process.exit(1)
      }
      timeout = n
      i += 1
      continue
    }
    if (a === '--instructions') {
      const next = rest[i + 1]
      if (!next || next.startsWith('--')) {
        process.stderr.write('--instructions requires a file path\n')
        process.exit(1)
      }
      instructions = next
      i += 1
      continue
    }
    if (a === '--untrusted-content') {
      const next = rest[i + 1]
      if (!next || next.startsWith('--')) {
        process.stderr.write('--untrusted-content requires a file path\n')
        process.exit(1)
      }
      untrustedContent = next
      i += 1
      continue
    }
    if (a === '--secret-mode') {
      const next = rest[i + 1]
      if (!next || !['scan', 'redact', 'allow'].includes(next)) {
        process.stderr.write('--secret-mode must be one of: scan, redact, allow\n')
        process.exit(1)
      }
      secretMode = next
      i += 1
      continue
    }
  }
  return { timeout, dryRun, instructions, untrustedContent, secretMode }
}

/**
 * Build the env passed to the child CLI. Fail-closed allowlist: only the
 * minimum locale/path scaffolding plus the entry's declared requiredEnv keys.
 * If requiredEnv is missing on the entry, nothing extra is forwarded — the
 * registry is the source of truth and missing means TODO, not "inherit all".
 *
 * @param {import('./registry.mjs').CliEntry} entry
 * @param {NodeJS.ProcessEnv} parentEnv
 * @returns {NodeJS.ProcessEnv}
 */
function buildChildEnv(entry, parentEnv) {
  const baseKeys = ['PATH', 'HOME', 'USER', 'LANG', 'TMPDIR', 'TMP', 'TEMP', 'TERM', 'SHELL']
  /** @type {NodeJS.ProcessEnv} */
  const env = {}
  for (const k of baseKeys) {
    if (parentEnv[k] !== undefined) env[k] = parentEnv[k]
  }
  // LC_* locale family (LC_ALL, LC_CTYPE, etc.) — pass any that are set.
  for (const k of Object.keys(parentEnv)) {
    if (k.startsWith('LC_') && parentEnv[k] !== undefined) env[k] = parentEnv[k]
  }
  for (const k of entry.requiredEnv ?? []) {
    if (parentEnv[k] !== undefined) env[k] = parentEnv[k]
  }
  return env
}

function readStdin() {
  // If stdin is a TTY no producer is piping data — reading fd 0 would either
  // hang (if we asked for raw mode) or yield nothing useful. Skip the read so
  // genuine I/O failures below surface as errors instead of empty strings.
  if (process.stdin.isTTY) return ''
  try {
    return readFileSync(0, 'utf8')
  } catch (err) {
    throw new Error(`invoke-cli: failed to read stdin: ${err.message}`)
  }
}
