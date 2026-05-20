#!/usr/bin/env node
/**
 * detect-clis — probe for AI coding CLIs available on $PATH.
 *
 * Outputs JSON to stdout (one entry per registered CLI):
 *
 *   {
 *     "id": "claude-code",
 *     "name": "Claude Code",
 *     "binary": "claude",
 *     "available": true,
 *     "path": "/opt/homebrew/bin/claude",
 *     "version": "2.1.119" | null,
 *     "promptTemplate": "claude -p {{PROMPT}}",
 *     "stdinTemplate": "claude -p" | null,
 *     "notes": "..." | null
 *   }
 *
 * Flags:
 *   --available-only    only emit entries with available: true
 *   --names-only        emit just the names (one per line)
 *   --pretty            pretty-print JSON (default: compact for piping)
 *
 * Exit code: 0 always (probing is best-effort; empty result means "no CLIs found").
 */

import { locateBinary, probeSubcommand, readVersion } from './probe.mjs'
import { REGISTRY } from './registry.mjs'

const flags = parseFlags(process.argv.slice(2))
// Probes spawn version checks per entry; running them in parallel collapses
// the wall-clock cost from O(N * spawn_latency) to roughly one spawn latency.
const probed = await Promise.all(REGISTRY.map(probe))
const results = probed.filter((entry) => !flags.availableOnly || entry.available)

if (flags.namesOnly) {
  for (const r of results) process.stdout.write(`${r.name}\n`)
} else {
  process.stdout.write(JSON.stringify(results, null, flags.pretty ? 2 : 0) + '\n')
}

/**
 * Probe a single registry entry — never throws.
 * @param {import('./registry.mjs').CliEntry} entry
 */
async function probe(entry) {
  const located = locateBinary(entry.binary)
  let found = located
  if (located.available && entry.subcommand) {
    found = await probeSubcommand(entry, located.path)
  }
  return {
    id: entry.id,
    name: entry.name,
    binary: entry.binary,
    available: found.available,
    path: found.path,
    // Version probe runs against the absolute path to defeat $PATH hijack.
    version: found.available ? await readVersion(entry, found.path) : null,
    promptTemplate: entry.promptTemplate,
    stdinTemplate: entry.stdinTemplate ?? null,
    notes: entry.notes ?? null,
  }
}

/** @param {string[]} argv */
function parseFlags(argv) {
  const set = new Set(argv)
  return {
    availableOnly: set.has('--available-only'),
    namesOnly: set.has('--names-only'),
    pretty: set.has('--pretty'),
  }
}
