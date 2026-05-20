#!/usr/bin/env node
/**
 * wrap-prompt — read trusted instructions + untrusted content, write a
 * salted-tag-wrapped prompt to stdout. Standalone CLI for skills that
 * shell out instead of importing composeWrappedPrompt directly.
 *
 * Usage:
 *   wrap-prompt --instructions <file> --untrusted-content <file>
 *
 * Exit codes:
 *   0  — success (composed prompt on stdout)
 *   1  — argument error or missing file
 *
 * Example:
 *   wrap-prompt --instructions persona.md --untrusted-content diff.txt | codex exec -
 */

import { existsSync, readFileSync } from 'node:fs'

import { composeWrappedPrompt } from './compose.mjs'

const argv = process.argv.slice(2)
const flags = parseFlags(argv)

if (!flags.instructions || !flags.untrustedContent) {
  process.stderr.write('Usage: wrap-prompt --instructions <file> --untrusted-content <file>\n')
  process.exit(1)
}

const instructions = readFileOrExit(flags.instructions, '--instructions')
const untrusted = readFileOrExit(flags.untrustedContent, '--untrusted-content')
const { prompt } = composeWrappedPrompt({ instructions, untrusted })

process.stdout.write(prompt)
if (!prompt.endsWith('\n')) process.stdout.write('\n')

/** @param {string[]} args */
function parseFlags(args) {
  let instructionsPath = null
  let untrustedPath = null
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i]
    if (a === '--instructions') {
      const next = args[i + 1]
      if (!next || next.startsWith('--')) {
        process.stderr.write('--instructions requires a file path\n')
        process.exit(1)
      }
      instructionsPath = next
      i += 1
      continue
    }
    if (a === '--untrusted-content') {
      const next = args[i + 1]
      if (!next || next.startsWith('--')) {
        process.stderr.write('--untrusted-content requires a file path\n')
        process.exit(1)
      }
      untrustedPath = next
      i += 1
      continue
    }
  }
  return { instructions: instructionsPath, untrustedContent: untrustedPath }
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
