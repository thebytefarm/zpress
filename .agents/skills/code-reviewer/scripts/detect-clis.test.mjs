import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'

const SCRIPT = path.join(import.meta.dirname, 'detect-clis.mjs')

function run(args = []) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' })
}

test('exits 0 with no flags', () => {
  const r = run()
  assert.equal(r.status, 0)
})

test('emits parseable JSON by default', () => {
  const r = run()
  const parsed = JSON.parse(r.stdout)
  assert.ok(Array.isArray(parsed), 'expected an array')
  assert.ok(parsed.length > 0, 'expected at least one entry')
})

test('every emitted entry has the documented shape', () => {
  const parsed = JSON.parse(run().stdout)
  for (const entry of parsed) {
    assert.equal(typeof entry.id, 'string')
    assert.equal(typeof entry.name, 'string')
    assert.equal(typeof entry.binary, 'string')
    assert.equal(typeof entry.available, 'boolean')
    assert.equal(typeof entry.promptTemplate, 'string')
    if (entry.available) {
      assert.equal(typeof entry.path, 'string')
    } else {
      assert.equal(entry.path, null)
      assert.equal(entry.version, null)
    }
  }
})

test('--available-only filters to available CLIs', () => {
  const parsed = JSON.parse(run(['--available-only']).stdout)
  for (const entry of parsed) {
    assert.equal(entry.available, true, `unavailable entry leaked: ${entry.id}`)
  }
})

test('--names-only emits one name per line', () => {
  const r = run(['--names-only'])
  assert.equal(r.status, 0)
  const lines = r.stdout.trim().split('\n')
  assert.ok(lines.length > 0)
  for (const line of lines) assert.ok(line.length > 0)
})

test('--pretty emits formatted JSON', () => {
  const r = run(['--pretty'])
  assert.ok(r.stdout.includes('\n  '), 'pretty output should contain indentation')
})
