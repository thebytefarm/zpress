/**
 * secret-shield/scan — detect and (optionally) redact known secret formats
 * in untrusted content before forwarding to a third-party LLM.
 *
 * Mitigates W007 (insecure credential handling) when a skill ingests
 * code/diffs and could exfiltrate embedded secrets to an external CLI.
 * Pure — no I/O. Vendored into each consuming skill via skill-tools
 * sync-scripts; do not edit the vendored copy.
 *
 * Detection is regex-based against the curated `patterns.mjs` registry.
 * No entropy heuristics, no LLM judges — false-positive rate stays low
 * by trading recall for precision (we'd rather miss an obscure secret
 * than block on a base64 string that happens to look like one).
 *
 * See contributing/prompt-injection.md for the threat model.
 */

import { PATTERNS } from './patterns.mjs'

/**
 * @typedef {object} SecretFinding
 * @property {string} id          Pattern id (e.g. "aws-access-key")
 * @property {string} name        Human-readable pattern name
 * @property {"high"|"medium"} severity
 * @property {number} line        1-based line number where the match starts
 * @property {number} column      1-based column number where the match starts
 * @property {number} length      Byte length of the matched secret
 */

/**
 * @typedef {object} RawMatch
 * @property {string} id
 * @property {string} name
 * @property {"high"|"medium"} severity
 * @property {number} start
 * @property {number} end
 */

/**
 * Scan content for known secret formats. Returns one finding per match.
 * Multiple secrets of the same type produce multiple findings.
 *
 * @param {object} args
 * @param {string} args.content
 * @returns {{ findings: SecretFinding[], hasFindings: boolean }}
 */
export function scanForSecrets({ content }) {
  const matches = collectMatches(content)
  const newlines = newlineIndex(content)
  const findings = matches
    .map((m) => toFinding(m, content, newlines))
    .sort((a, b) => (a.line === b.line ? a.column - b.column : a.line - b.line))
  return { findings, hasFindings: findings.length > 0 }
}

/**
 * Replace every detected secret in `content` with a `[REDACTED-{id}-{n}]`
 * placeholder. Each finding gets a unique counter `n` (per pattern id) so
 * repeated secrets are distinguishable in review output.
 *
 * The replacement preserves byte alignment poorly (placeholders differ in
 * length from originals), so consumers should not rely on offsets after
 * redaction.
 *
 * @param {object} args
 * @param {string} args.content
 * @returns {{ content: string, findings: SecretFinding[] }}
 */
export function redactSecrets({ content }) {
  const matches = collectMatches(content).sort((a, b) => a.start - b.start)

  // Drop overlapping matches — keep the earlier one. `matches` is already
  // sorted by start, so a later entry that begins before the previous one
  // ends is the overlap to discard.
  /** @type {RawMatch[]} */
  const kept = []
  for (const m of matches) {
    const last = kept[kept.length - 1]
    if (last && m.start < last.end) continue
    kept.push(m)
  }

  /** @type {Map<string, number>} */
  const counters = new Map()
  let out = ''
  let cursor = 0
  for (const m of kept) {
    out += content.slice(cursor, m.start)
    const next = (counters.get(m.id) ?? 0) + 1
    counters.set(m.id, next)
    out += `[REDACTED-${m.id}-${next}]`
    cursor = m.end
  }
  out += content.slice(cursor)

  const newlines = newlineIndex(content)
  const findings = kept
    .map((m) => toFinding(m, content, newlines))
    .sort((a, b) => (a.line === b.line ? a.column - b.column : a.line - b.line))

  return { content: out, findings }
}

/**
 * Run every registered pattern against `content` and collect raw matches.
 * Patterns reuse their pre-compiled RegExp (lastIndex reset here) so the
 * hot loop avoids per-call RegExp construction.
 *
 * @param {string} content
 * @returns {RawMatch[]}
 * @private
 */
function collectMatches(content) {
  /** @type {RawMatch[]} */
  const matches = []
  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0
    let m
    while ((m = pattern.regex.exec(content)) !== null) {
      matches.push({
        id: pattern.id,
        name: pattern.name,
        severity: pattern.severity,
        start: m.index,
        end: m.index + m[0].length,
      })
      // Guard against zero-width matches in malformed patterns.
      if (m.index === pattern.regex.lastIndex) pattern.regex.lastIndex += 1
    }
  }
  return matches
}

/**
 * @param {RawMatch} m
 * @param {string} content
 * @param {number[]} newlines
 * @returns {SecretFinding}
 * @private
 */
function toFinding(m, content, newlines) {
  const { line, column } = locate(newlines, m.start)
  return {
    id: m.id,
    name: m.name,
    severity: m.severity,
    line,
    column,
    length: m.end - m.start,
  }
}

/**
 * Index every newline (LF) byte offset in `content` exactly once. Findings
 * later resolve their (line, column) by binary-searching this array — total
 * work drops from O(n × k) to O(n + k log n) for k findings.
 *
 * @param {string} content
 * @returns {number[]}
 * @private
 */
function newlineIndex(content) {
  /** @type {number[]} */
  const indices = []
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 10) indices.push(i)
  }
  return indices
}

/**
 * Translate a byte index into (line, column), both 1-based, by binary-
 * searching the precomputed newline index.
 *
 * @param {number[]} newlines
 * @param {number} index
 * @returns {{ line: number, column: number }}
 * @private
 */
function locate(newlines, index) {
  // Find the count of newlines strictly before `index`. That's the 0-based
  // line offset; +1 makes it 1-based. The newline at position p ends line
  // (p+1)-th's predecessor, so a byte at index > p is on line (count+1).
  let lo = 0
  let hi = newlines.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (newlines[mid] < index) lo = mid + 1
    else hi = mid
  }
  const line = lo + 1
  const lastNewline = lo === 0 ? -1 : newlines[lo - 1]
  return { line, column: index - lastNewline }
}
