import assert from 'node:assert/strict'
import { test } from 'node:test'

import { REGISTRY, findEntry } from './registry.mjs'

test('REGISTRY has at least 15 entries', () => {
  assert.ok(REGISTRY.length >= 15, `expected >= 15, got ${REGISTRY.length}`)
})

test('every entry has the required shape', () => {
  for (const e of REGISTRY) {
    assert.ok(e.id, `missing id: ${JSON.stringify(e)}`)
    assert.ok(e.name, `missing name on ${e.id}`)
    assert.ok(e.binary, `missing binary on ${e.id}`)
    assert.ok(e.promptTemplate, `missing promptTemplate on ${e.id}`)
    if (!e.subcommand) {
      assert.ok(
        e.promptTemplate.includes('{{PROMPT}}'),
        `${e.id}: promptTemplate must contain {{PROMPT}}`
      )
    }
    if (e.stdinTemplate !== null && e.stdinTemplate !== undefined) {
      assert.equal(typeof e.stdinTemplate, 'string')
    }
  }
})

test('ids are unique kebab-case', () => {
  const seen = new Set()
  for (const e of REGISTRY) {
    assert.match(e.id, /^[a-z][a-z0-9-]+[a-z0-9]$/, `bad id: ${e.id}`)
    assert.ok(!seen.has(e.id), `duplicate id: ${e.id}`)
    seen.add(e.id)
  }
})

test('canonical CLIs are present', () => {
  const ids = new Set(REGISTRY.map((e) => e.id))
  for (const required of ['claude-code', 'codex', 'gemini-cli', 'aider', 'ollama']) {
    assert.ok(ids.has(required), `missing canonical id: ${required}`)
  }
})

test('subcommand entries declare a check command', () => {
  for (const e of REGISTRY) {
    if (!e.subcommand) continue
    assert.ok(e.subcommandCheck, `${e.id}: subcommand entries need subcommandCheck`)
  }
})

test('every entry declares a requiredEnv array (may be empty)', () => {
  // Empty array signals "no env keys needed" (e.g., ollama).
  // Missing array means the registry hasn't decided yet — fail-closed in
  // invoke-cli will inherit nothing, but the array should still be present so
  // the contract is explicit.
  for (const e of REGISTRY) {
    assert.ok(Array.isArray(e.requiredEnv), `${e.id}: requiredEnv must be an array`)
    for (const key of e.requiredEnv) {
      assert.equal(typeof key, 'string', `${e.id}: requiredEnv contains non-string`)
      assert.match(key, /^[A-Z][A-Z0-9_]*$/, `${e.id}: requiredEnv key not SHOUT_CASE: ${key}`)
    }
  }
})

test('github-copilot entry sets subcommandMatch explicitly', () => {
  const gh = findEntry('github-copilot')
  assert.ok(gh)
  assert.equal(gh.subcommandMatch, 'copilot')
})

test('findEntry returns matching entry', () => {
  const codex = findEntry('codex')
  assert.ok(codex)
  assert.equal(codex.binary, 'codex')
})

test('findEntry returns null for unknown id', () => {
  assert.equal(findEntry('definitely-not-real-cli-id-1234'), null)
})
