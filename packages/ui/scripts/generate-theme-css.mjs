/**
 * Generate theme CSS files from the @zpress/theme registry.
 *
 * Reads `BUILT_IN_THEMES` from `@zpress/theme` and renders each entry with
 * `themeToCss`, then writes the result to:
 *
 *   - packages/ui/src/theme/styles/themes/{base,midnight,arcade}.css
 *   - packages/ui/src/head/css/themes/{base,midnight,arcade}.css   (FOUC fallback)
 *
 * Both output paths receive the same byte-identical body — the FOUC mirror
 * exists so the head injector can ship the critical block inline before the
 * runtime stylesheet loads. Every generated file is prefixed with a clear
 * "GENERATED — DO NOT EDIT" banner.
 *
 * Modes:
 *
 *   - default     write all generated files to disk
 *   - --check     compare on-disk contents against the freshly rendered
 *                 output; exit 0 if everything is in sync, exit 1 otherwise.
 *
 * Determinism is guaranteed by `themeToCss` — it iterates `TOKEN_TO_CSS_VAR`
 * in declaration order, so re-running this script on the same inputs always
 * produces the same bytes.
 *
 * Style: ESM, functional, no classes, no loops, no throw. Errors are reported
 * by writing to stderr and exiting with a non-zero code at the boundary.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BUILT_IN_THEMES, themeToCss } from '@zpress/theme'

// ---------------------------------------------------------------------------
// Module-level constants
// ---------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const THEME_STYLES_DIR = resolve(ROOT, 'src/theme/styles/themes')
const HEAD_STYLES_DIR = resolve(ROOT, 'src/head/css/themes')

const GENERATED_BANNER = '/* GENERATED — DO NOT EDIT — run scripts/generate-theme-css.mjs */\n'

// Derived from the registry so adding a fourth built-in theme to
// `BUILT_IN_THEMES` automatically expands generator output — no separate
// hardcoded list to keep in sync.
const THEME_NAMES = Object.freeze(Object.keys(BUILT_IN_THEMES))

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Render a single theme to its final CSS string (banner + body).
 *
 * @param {string} name - Built-in theme name (`base` | `midnight` | `arcade`)
 * @returns {string} Banner-prefixed CSS source
 */
const renderThemeCss = (name) => `${GENERATED_BANNER}\n${themeToCss(BUILT_IN_THEMES[name])}`

/**
 * Build the full list of `{ path, contents }` targets the script manages.
 *
 * Each theme writes to two locations — the runtime stylesheet directory and
 * the head/FOUC mirror — with identical bytes.
 *
 * @returns {ReadonlyArray<{ path: string, contents: string }>} Target manifest
 */
const buildTargets = () =>
  THEME_NAMES.flatMap((name) => {
    const contents = renderThemeCss(name)
    return [
      { path: resolve(THEME_STYLES_DIR, `${name}.css`), contents },
      { path: resolve(HEAD_STYLES_DIR, `${name}.css`), contents },
    ]
  })

/**
 * Read a file as UTF-8 and return its contents, or `null` if the file does
 * not exist. Surfacing missing files as `null` lets `--check` report them
 * as stale rather than crashing with ENOENT.
 *
 * @param {string} path - Absolute file path
 * @returns {Promise<string | null>} File contents or `null` if missing
 */
const readFileOrNull = async (path) => {
  try {
    return await readFile(path, 'utf8')
  } catch (err) {
    if (err && err.code === 'ENOENT') return null
    process.stderr.write(`[zpress] failed to read ${path}: ${err.message}\n`)
    process.exit(1)
  }
}

/**
 * Write `contents` to `path`, creating parent directories as needed.
 *
 * @param {string} path - Absolute destination path
 * @param {string} contents - File body to write
 * @returns {Promise<void>}
 */
const writeFileEnsuringDir = async (path, contents) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, contents, 'utf8')
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

/**
 * Write every generated theme CSS file to disk.
 *
 * @returns {Promise<void>}
 */
const runWrite = async () => {
  const targets = buildTargets()
  await Promise.all(targets.map(({ path, contents }) => writeFileEnsuringDir(path, contents)))
  process.stdout.write(`[zpress] wrote ${targets.length} theme CSS file(s)\n`)
}

/**
 * Compare each generated target against its on-disk contents. Print a
 * stale-file report and exit non-zero if any file is out of date.
 *
 * @returns {Promise<void>}
 */
const runCheck = async () => {
  const targets = buildTargets()
  const results = await Promise.all(
    targets.map(async ({ path, contents }) => {
      const current = await readFileOrNull(path)
      return { path, fresh: current === contents }
    })
  )
  const stale = results.filter((r) => !r.fresh)
  if (stale.length === 0) {
    process.stdout.write(`[zpress] theme CSS is up to date (${targets.length} file(s) checked)\n`)
    return
  }
  process.stderr.write(
    `[zpress] theme CSS is stale — re-run scripts/generate-theme-css.mjs:\n${stale
      .map((s) => `  - ${s.path}`)
      .join('\n')}\n`
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

const isCheckMode = process.argv.includes('--check')
// eslint-disable-next-line no-ternary -- two-branch entrypoint selector
const task = (() => {
  if (isCheckMode) {
    return runCheck()
  }
  return runWrite()
})()

task.catch((err) => {
  process.stderr.write(`[zpress] generate-theme-css failed: ${err.message}\n`)
  process.exit(1)
})
