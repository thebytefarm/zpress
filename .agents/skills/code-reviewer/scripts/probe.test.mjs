import assert from 'node:assert/strict'
import { test } from 'node:test'

import { locateBinary, pathExtCandidates, probeSubcommand, readVersion } from './probe.mjs'

test('locateBinary finds node (always present in test env)', () => {
  const result = locateBinary('node')
  assert.equal(result.available, true)
  assert.ok(typeof result.path === 'string')
})

test('locateBinary returns null path for missing binary', () => {
  const result = locateBinary('this-binary-does-not-exist-9876543210')
  assert.equal(result.available, false)
  assert.equal(result.path, null)
})

test('pathExtCandidates returns just empty string on POSIX', () => {
  // On POSIX hosts the candidate list is just [''] — the bare name. Skip on
  // Windows; the behavior there is platform-specific by design.
  if (process.platform === 'win32') return
  const candidates = pathExtCandidates()
  assert.deepEqual(candidates, [''])
})

test('readVersion against the absolute path of node returns a version string', async () => {
  const located = locateBinary('node')
  assert.equal(located.available, true)
  const entry = { id: 'node', binary: 'node', versionFlag: '--version' }
  const version = await readVersion(entry, located.path)
  assert.ok(version, 'expected a version string')
  assert.match(version, /\d+\.\d+\.\d+/)
})

test('readVersion returns null when the binary path is bogus', async () => {
  const entry = { id: 'bogus', binary: 'bogus' }
  const version = await readVersion(entry, '/nonexistent/path/to/bogus-binary')
  assert.equal(version, null)
})

test('probeSubcommand returns available when subcommandCheck has no command', async () => {
  // Entry without a subcommandCheck — the probe trivially passes once the
  // parent binary has been located.
  const entry = { id: 'parent', binary: 'parent' }
  const result = await probeSubcommand(entry, '/usr/bin/parent')
  assert.equal(result.available, true)
})

test('probeSubcommand fails closed when subcommandMatch substring is missing', async () => {
  // Use `node --version` as a generic check: stdout will contain a version
  // number but not the literal string 'absolutely-not-in-output'.
  const located = locateBinary('node')
  assert.equal(located.available, true)
  const entry = {
    id: 'fake',
    binary: 'node',
    subcommandCheck: 'node --version',
    subcommandMatch: 'absolutely-not-in-output',
  }
  const result = await probeSubcommand(entry, located.path)
  assert.equal(result.available, false)
})

test('probeSubcommand passes when subcommandMatch is present in stdout', async () => {
  // `node --version` prints "vX.Y.Z" — the substring "v" is always there.
  const located = locateBinary('node')
  const entry = {
    id: 'fake',
    binary: 'node',
    subcommandCheck: 'node --version',
    subcommandMatch: 'v',
  }
  const result = await probeSubcommand(entry, located.path)
  assert.equal(result.available, true)
  assert.equal(result.path, located.path)
})

test('probeSubcommand defaults subcommandMatch to entry.id', async () => {
  // entry.id 'node' is not in `node --version` output ("v22.x.x"), so this
  // should fail closed — confirming the default kicks in.
  const located = locateBinary('node')
  const entry = {
    id: 'definitely-not-in-output',
    binary: 'node',
    subcommandCheck: 'node --version',
  }
  const result = await probeSubcommand(entry, located.path)
  assert.equal(result.available, false)
})
