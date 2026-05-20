import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildInvocation, tokenize } from './invocation.mjs'
import { findEntry } from './registry.mjs'

const FAKE_PATH = '/opt/test/bin/fake'

test('buildInvocation: stdin mode for entry with stdinTemplate', () => {
  const entry = findEntry('codex')
  const plan = buildInvocation({ entry, prompt: 'hello world', absolutePath: FAKE_PATH })
  assert.equal(plan.mode, 'stdin')
  assert.equal(plan.command, FAKE_PATH)
  assert.deepEqual(plan.args, ['exec', '-'])
  assert.equal(plan.stdin, 'hello world')
  assert.equal(plan.usedStdin, true)
})

test('buildInvocation: argv mode when no stdinTemplate', () => {
  const entry = findEntry('aider')
  const plan = buildInvocation({ entry, prompt: 'review this', absolutePath: FAKE_PATH })
  assert.equal(plan.mode, 'argv')
  assert.equal(plan.command, FAKE_PATH)
  assert.ok(plan.args.includes('review this'))
  assert.equal(plan.stdin, null)
  assert.equal(plan.usedStdin, false)
})

test('buildInvocation: substitutes {{PROMPT}} verbatim including special chars', () => {
  const entry = findEntry('aider')
  const tricky = 'review this `code` with $VARS and "quotes"'
  const plan = buildInvocation({ entry, prompt: tricky, absolutePath: FAKE_PATH })
  assert.ok(plan.args.includes(tricky), 'special chars must be passed verbatim through argv')
})

test('buildInvocation: throws if promptTemplate lacks {{PROMPT}}', () => {
  const broken = {
    id: 'broken',
    name: 'Broken',
    binary: 'broken',
    promptTemplate: 'broken --no-placeholder',
    stdinTemplate: null,
  }
  assert.throws(
    () => buildInvocation({ entry: broken, prompt: 'p', absolutePath: FAKE_PATH }),
    /PROMPT/
  )
})

test('buildInvocation: command is always the absolute path, not entry.binary', () => {
  // Defends against $PATH-shadow where locateBinary blesses one binary but
  // the bare name resolves to a different one at spawn time.
  const entry = findEntry('codex')
  const plan = buildInvocation({ entry, prompt: 'x', absolutePath: '/somewhere/else/codex' })
  assert.equal(plan.command, '/somewhere/else/codex')
  assert.notEqual(plan.command, 'codex')
})

test('tokenize splits on whitespace and trims', () => {
  assert.deepEqual(tokenize('  foo   bar  baz  '), ['foo', 'bar', 'baz'])
})
