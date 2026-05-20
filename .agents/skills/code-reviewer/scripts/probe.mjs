/**
 * Filesystem + spawn helpers for binary discovery. Imported by detect-clis.mjs.
 *
 * Probes are async (execFile + promisify) so callers can fan out via
 * Promise.all — sequential probing of the registry adds 0.5–3s of wall time.
 *
 * `readVersion` and `probeSubcommand` accept the absolute path returned by
 * `locateBinary` (not the bare entry.binary name). This defeats $PATH hijack
 * — execFile's own resolver would otherwise re-search $PATH and could land on
 * a different binary than the one `locateBinary` blessed.
 */

import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Candidate file extensions to probe for a binary on $PATH. POSIX hosts only
 * try the bare name; Windows additionally tries the executable extensions
 * registered in `PATHEXT` (npm-installed CLIs typically ship as `<name>.cmd`
 * shims, not extensionless `<name>`).
 *
 * @returns {string[]}
 */
export function pathExtCandidates() {
  if (process.platform !== 'win32') return ['']
  // Windows PATHEXT default is `.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC`.
  // Only the executable shapes are interesting for CLI probing.
  const raw = process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD'
  const exts = raw
    .split(';')
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (e.startsWith('.') ? e : `.${e}`))
  // Try the bare name first (lets a non-shimmed binary win), then the registered
  // extensions in PATHEXT order.
  return ['', ...exts]
}

/**
 * Walk $PATH for a binary. Returns absolute path on success, null on miss.
 * Pure — never throws. Sync because `statSync` is cheap.
 *
 * @param {string} binary
 * @returns {{ available: true, path: string } | { available: false, path: null }}
 */
export function locateBinary(binary) {
  const dirs = (process.env.PATH ?? '').split(path.delimiter)
  const extCandidates = pathExtCandidates()
  for (const dir of dirs) {
    if (!dir) continue
    for (const ext of extCandidates) {
      const candidate = path.join(dir, binary + ext)
      let stat
      try {
        // Follow symlinks (e.g. /usr/local/bin/claude → real binary).
        stat = statSync(candidate)
      } catch {
        // ENOENT, EACCES on parent dir, dangling symlink, etc.
        continue
      }
      if (!stat.isFile()) continue
      // POSIX: any execute bit (owner / group / other). On Windows, executability
      // is determined by file extension (PATHEXT), not mode bits, so fall back to
      // the existence-style check there to avoid false negatives.
      if (process.platform !== 'win32' && (stat.mode & 0o111) === 0) continue
      return { available: true, path: candidate }
    }
  }
  return { available: false, path: null }
}

/**
 * Best-effort version probe. Returns the version string or null. Never throws.
 *
 * @param {import('./registry.mjs').CliEntry} entry
 * @param {string} absolutePath  Absolute path returned by locateBinary —
 *   passed verbatim to execFile to defeat $PATH hijack.
 * @returns {Promise<string | null>}
 */
export async function readVersion(entry, absolutePath) {
  const flag = entry.versionFlag ?? '--version'
  try {
    const { stdout } = await execFileAsync(absolutePath, [flag], {
      encoding: 'utf8',
      timeout: 3000,
    })
    const semver = stdout.match(/\d+\.\d+(?:\.\d+)?/)
    return semver ? semver[0] : stdout.trim().split('\n')[0].slice(0, 64)
  } catch {
    return null
  }
}

/**
 * Subcommand probe: parent must exist AND the subcommand check must succeed
 * with the expected substring in stdout.
 *
 * The match string defaults to `entry.id` so the probe stays generic; entries
 * that need a different match (e.g. github-copilot looks for "copilot") set
 * `subcommandMatch` explicitly.
 *
 * @param {import('./registry.mjs').CliEntry} entry
 * @param {string} absolutePath  Absolute path of the parent binary.
 * @returns {Promise<{ available: true, path: string } | { available: false, path: null }>}
 */
export async function probeSubcommand(entry, absolutePath) {
  if (!entry.subcommandCheck) return { available: true, path: absolutePath }
  // Replace the bare parent name in the check command with its absolute path
  // so the subcommand probe also runs against the blessed binary.
  const tokens = entry.subcommandCheck.trim().split(/\s+/)
  const [head, ...rest] = tokens
  const cmd = head === entry.binary ? absolutePath : head
  const match = entry.subcommandMatch ?? entry.id
  try {
    const { stdout } = await execFileAsync(cmd, rest, {
      encoding: 'utf8',
      timeout: 3000,
    })
    if (stdout.toLowerCase().includes(match.toLowerCase())) {
      return { available: true, path: absolutePath }
    }
  } catch {
    /* best-effort */
  }
  return { available: false, path: null }
}
