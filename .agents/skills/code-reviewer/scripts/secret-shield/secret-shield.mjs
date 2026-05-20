#!/usr/bin/env node
/**
 * secret-shield — scan a file for known secret formats, optionally redact.
 *
 * Usage:
 *   secret-shield --scan <file>            # exit 1 if findings; report JSON to stdout
 *   secret-shield --redact <file>          # write redacted content to stdout (always exit 0)
 *   secret-shield --scan --quiet <file>    # exit code only, no stdout
 *
 * Exit codes:
 *   0  — no findings (scan), or success (redact)
 *   1  — findings present (scan), or argument error
 *
 * Examples:
 *   secret-shield --scan diff.txt && echo "clean"
 *   secret-shield --redact diff.txt | sha256sum
 */

import { existsSync, readFileSync } from 'node:fs'

import { redactSecrets, scanForSecrets } from './scan.mjs'

const argv = process.argv.slice(2)
const flags = parseFlags(argv)

if (!flags.file) {
  process.stderr.write('Usage: secret-shield --scan <file> | --redact <file>\n')
  process.exit(1)
}
if (!flags.scan && !flags.redact) {
  process.stderr.write('Pass either --scan or --redact\n')
  process.exit(1)
}
if (flags.scan && flags.redact) {
  process.stderr.write('Pass --scan OR --redact, not both\n')
  process.exit(1)
}
if (!existsSync(flags.file)) {
  process.stderr.write(`File not found: ${flags.file}\n`)
  process.exit(1)
}

const content = readFileSync(flags.file, 'utf8')

if (flags.scan) {
  const { findings, hasFindings } = scanForSecrets({ content })
  if (!flags.quiet) {
    process.stdout.write(JSON.stringify({ findings, hasFindings }, null, 2) + '\n')
  }
  process.exit(hasFindings ? 1 : 0)
}

const { content: redacted } = redactSecrets({ content })
process.stdout.write(redacted)
if (!redacted.endsWith('\n')) process.stdout.write('\n')

/** @param {string[]} args */
function parseFlags(args) {
  let scan = false
  let redact = false
  let quiet = false
  let file = null
  for (const a of args) {
    if (a === '--scan') scan = true
    else if (a === '--redact') redact = true
    else if (a === '--quiet') quiet = true
    else if (!a.startsWith('--') && !file) file = a
  }
  return { scan, redact, quiet, file }
}
