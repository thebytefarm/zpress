import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'

import { command } from '@kidd-cli/core'

import { generateAssets } from '../lib/banner/index.ts'
import { createPaths } from '../lib/paths.ts'
import type { Paths } from '../lib/paths.ts'

const CONFIG_FILENAME = 'zpress.config.ts'

/**
 * Initialize a zpress config file in the project root.
 *
 * Derives the project title from the git remote origin (falling back
 * to the directory name), writes a starter `zpress.config.ts`,
 * and generates initial banner/logo assets.
 */
export default command({
  name: 'setup',
  description: 'Initialize a zpress config in the current project',
  handler: async (ctx) => {
    const cwd = process.cwd()
    const paths = createPaths(cwd)
    const configPath = path.join(paths.repoRoot, CONFIG_FILENAME)

    ctx.log.intro('zpress setup')

    if (fs.existsSync(configPath)) {
      ctx.log.warn(`${CONFIG_FILENAME} already exists — skipping`)
      ctx.log.outro('Done')
      return
    }

    const title = deriveTitle(cwd)

    fs.writeFileSync(configPath, buildConfigTemplate(title), 'utf8')
    ctx.log.success(`Created ${CONFIG_FILENAME} (title: "${title}")`)

    // Ensure .zpress/ is gitignored
    await ensureGitignore(paths, ctx.log)

    // Generate initial banner, logo, and icon assets
    await fsPromises.mkdir(paths.publicDir, { recursive: true })
    const [assetErr, written] = await generateAssets({
      config: { title, tagline: undefined },
      publicDir: paths.publicDir,
    })

    if (assetErr) {
      ctx.log.error(`Asset generation failed: ${assetErr.message}`)
      process.exit(1)
    }

    if (written.length > 0) {
      ctx.log.success(`Generated ${written.join(', ')}`)
    }

    ctx.log.outro('Done')
  },
})

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Extract the repository name from the git remote origin URL.
 * Returns `null` if not in a git repo or no origin is configured.
 *
 * @private
 * @param cwd - Working directory to run git commands in
 * @returns Repository name or null
 */
function extractGitRepoName(cwd: string): string | null {
  const url = execSilent('git', ['remote', 'get-url', 'origin'], cwd)
  if (!url) {
    return null
  }

  // Handle SSH (git@github.com:org/repo.git) and HTTPS (https://github.com/org/repo.git)
  const match = url.match(/[/:]([^/:]+?)(?:\.git)?$/)
  if (!match) {
    return null
  }

  return match[1]
}

/**
 * Run a command silently with an explicit argument array, returning
 * trimmed stdout or `null` on failure.
 *
 * Uses `execFileSync` (not `execSync`) to avoid shell interpolation
 * and defend against command injection.
 *
 * @private
 * @param file - Executable to run
 * @param args - Arguments to pass to the executable
 * @param cwd - Working directory for the command
 * @returns Trimmed stdout string or null on failure
 */
function execSilent(file: string, args: readonly string[], cwd: string): string | null {
  try {
    return execFileSync(file, [...args], { cwd, stdio: 'pipe', encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

/**
 * Derive a project title from git origin repo name or the current directory name.
 *
 * @private
 * @param cwd - Working directory to derive the title from
 * @returns Project title string
 */
function deriveTitle(cwd: string): string {
  const repoName = extractGitRepoName(cwd)
  if (repoName) {
    return repoName
  }
  return path.basename(cwd)
}

/**
 * Build a config template string with the given title.
 *
 * @private
 * @param title - Project title to embed in the template
 * @returns Config file content string
 */
function buildConfigTemplate(title: string): string {
  const escaped = title.replaceAll("'", String.raw`\'`)
  return `import { defineConfig } from '@zpress/kit'

export default defineConfig({
  title: '${escaped}',
  sections: [
    {
      title: 'Getting Started',
      path: '/getting-started',
      include: 'docs/*.md',
    },
  ],
})
`
}

const ZPRESS_GITIGNORE_ENTRY = '.zpress/'

const NESTED_GITIGNORE_CONTENT = `# managed by zpress — ignore everything by default
*

# to track custom assets (e.g. banners, logos), uncomment the following lines:
# !public/
# !public/**
`

/**
 * Ensure .zpress/ is gitignored. Tries to append to the root .gitignore first;
 * if no root .gitignore exists, writes a nested .gitignore inside .zpress/ instead.
 *
 * @private
 * @param paths - Project paths
 * @param logger - Logger for status messages
 */
async function ensureGitignore(
  paths: Paths,
  logger: { success: (msg: string) => void }
): Promise<void> {
  const rootGitignore = path.join(paths.repoRoot, '.gitignore')

  if (fs.existsSync(rootGitignore)) {
    const content = fs.readFileSync(rootGitignore, 'utf8')
    const lines = content.split('\n')
    const alreadyIgnored = lines.some(
      (line) => line.trim() === ZPRESS_GITIGNORE_ENTRY || line.trim() === '.zpress'
    )

    if (alreadyIgnored) {
      return
    }

    const suffix: string = (() => {
      if (content.endsWith('\n')) {
        return ''
      }
      return '\n'
    })()
    fs.writeFileSync(
      rootGitignore,
      `${content}${suffix}\n# zpress\n${ZPRESS_GITIGNORE_ENTRY}\n`,
      'utf8'
    )
    logger.success('Added .zpress/ to .gitignore')
    return
  }

  await fsPromises.mkdir(paths.outputRoot, { recursive: true })
  await fsPromises.writeFile(
    path.join(paths.outputRoot, '.gitignore'),
    NESTED_GITIGNORE_CONTENT,
    'utf8'
  )
  logger.success('Created .zpress/.gitignore')
}
