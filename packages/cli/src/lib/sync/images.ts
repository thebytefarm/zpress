import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Image file extensions recognized during sync.
 */
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
  '.ico',
])

/**
 * Regex matching fenced code blocks (to protect them from rewriting).
 */
const CODE_BLOCK_RE = /```[\s\S]*?```/g

/**
 * Placeholder prefix for protected code blocks.
 */
const PLACEHOLDER_PREFIX = '<!--ZPRESS_IMG_CB_'

/**
 * Placeholder suffix for protected code blocks.
 */
const PLACEHOLDER_SUFFIX = '-->'

/**
 * Regex to restore code block placeholders.
 */
const PLACEHOLDER_RE = /<!--ZPRESS_IMG_CB_(\d+)-->/g

/**
 * Regex matching markdown image syntax: `![alt](path)` or `![alt](path "title")`.
 */
// oxlint-disable-next-line security/detect-unsafe-regex -- pattern is bounded by non-overlapping character classes; no ReDoS risk
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g

/**
 * Regex matching HTML/JSX image `src` attributes: `src="path"` or `src='path'`.
 */
const IMG_SRC_RE = /<img\s[^>]*?src=["']([^"']+)["'][^>]*?\/?>/g

/**
 * Rewrite relative image references in markdown content.
 *
 * Scans for markdown image syntax (`![alt](path)`) and HTML/JSX image tags
 * (`<img src="path" />`), resolves relative paths against the source file
 * location, copies image files into the content public directory, and rewrites
 * paths to absolute `/images/filename.ext` URLs that Rspress can serve.
 *
 * Absolute paths, external URLs, and non-image extensions are left unchanged.
 * Code blocks are protected from rewriting.
 *
 * @param params - Content, source path, repo root, and output directory
 * @returns Rewritten content with absolute image paths
 */
export async function rewriteImages(params: {
  readonly content: string
  readonly sourcePath: string
  readonly repoRoot: string
  readonly outDir: string
}): Promise<string> {
  const sourceDir = path.dirname(path.resolve(params.repoRoot, params.sourcePath))
  const imagesOutDir = path.resolve(params.outDir, 'public', 'images')

  // 1. Protect code blocks
  // intentional mutation: collect code blocks during regex replacement
  const codeBlocks: string[] = []
  const withoutCode = params.content.replace(CODE_BLOCK_RE, (block) => {
    const idx = codeBlocks.length
    codeBlocks.push(block)
    return `${PLACEHOLDER_PREFIX}${idx}${PLACEHOLDER_SUFFIX}`
  })

  // 2. Discover relative image references and copy files
  const mdMatches = [...withoutCode.matchAll(IMAGE_RE)]
  const htmlMatches = [...withoutCode.matchAll(IMG_SRC_RE)]
  const allImagePaths = [...mdMatches.map((m) => m[1]), ...htmlMatches.map((m) => m[1])]

  const uniqueImagePaths = allImagePaths.filter(
    (imagePath, index, arr) =>
      !isAbsoluteOrExternal(imagePath) &&
      IMAGE_EXTENSIONS.has(path.extname(imagePath).toLowerCase()) &&
      arr.indexOf(imagePath) === index
  )

  if (uniqueImagePaths.length > 0) {
    await fs.mkdir(imagesOutDir, { recursive: true })
  }

  const entries = await Promise.all(
    uniqueImagePaths.map(async (imagePath): Promise<readonly [string, string] | null> => {
      const ext = path.extname(imagePath).toLowerCase()
      const absoluteImagePath = path.resolve(sourceDir, imagePath)
      const exists = await fs.stat(absoluteImagePath).catch(() => null)
      if (!exists) {
        return null
      }

      const baseName = path.basename(imagePath, path.extname(imagePath))
      const hash = createHash('md5').update(imagePath).digest('hex').slice(0, 8)
      const filename = `${baseName}-${hash}${ext}`
      const destPath = path.resolve(imagesOutDir, filename)

      // Skip copy when destination is at least as recent as source
      const destStat = await fs.stat(destPath).catch(() => null)
      if (destStat && destStat.mtimeMs >= exists.mtimeMs) {
        return [imagePath, `/images/${filename}`] as const
      }

      // oxlint-disable-next-line security/detect-non-literal-fs-filename -- paths are constructed from trusted repo root + user source paths
      await fs.copyFile(absoluteImagePath, destPath)

      return [imagePath, `/images/${filename}`] as const
    })
  )

  const imageMap = new Map(
    entries.filter((entry): entry is readonly [string, string] => entry !== null)
  )

  // 3. Replace image paths in content (markdown syntax and HTML/JSX tags)
  const mdRewritten = withoutCode.replace(IMAGE_RE, (fullMatch, url: string) => {
    const replacement = imageMap.get(url)
    if (replacement === undefined) {
      return fullMatch
    }
    return fullMatch.replace(url, replacement)
  })

  const rewritten = mdRewritten.replace(IMG_SRC_RE, (fullMatch, url: string) => {
    const replacement = imageMap.get(url)
    if (replacement === undefined) {
      return fullMatch
    }
    return fullMatch.replace(url, replacement)
  })

  // 4. Restore code blocks
  return rewritten.replace(PLACEHOLDER_RE, (_, idx) => codeBlocks[Number(idx)])
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Check whether a URL is absolute or external (should not be rewritten).
 *
 * @private
 * @param url - URL string to check
 * @returns True if the URL is absolute, protocol-based, or a data URI
 */
function isAbsoluteOrExternal(url: string): boolean {
  return (
    url.startsWith('/') ||
    url.startsWith('#') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  )
}
