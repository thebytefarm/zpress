/**
 * Auto-generated SVG banner, logo, and icon assets.
 *
 * Produces committable SVG files from the project title so users
 * get branded assets with zero manual work.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { toError } from 'massaman/conversion'

import { composeBanner } from './svg-banner.ts'
import { composeIcon } from './svg-icon.ts'
import { composeLogo } from './svg-logo.ts'
import { GENERATED_MARKER } from './svg-shared.ts'
import { assetError } from './types.ts'
import type { AssetConfig, AssetResult, GeneratedAsset } from './types.ts'

export type { AssetConfig, AssetError, AssetResult, GeneratedAsset } from './types.ts'

/**
 * Generate a banner SVG from the project config.
 *
 * @param config - Title and optional tagline
 * @returns Result containing the generated asset or an error
 */
export function generateBannerSvg(config: AssetConfig): AssetResult<GeneratedAsset> {
  if (config.title.trim().length === 0) {
    return [assetError('empty_title', 'Cannot generate banner: title is empty'), null]
  }

  return [
    null,
    {
      filename: 'banner.svg',
      content: composeBanner({ title: config.title, tagline: config.tagline }),
    },
  ]
}

/**
 * Generate a logo SVG from the project config.
 *
 * @param config - Title (tagline is ignored for logos)
 * @returns Result containing the generated asset or an error
 */
export function generateLogoSvg(config: AssetConfig): AssetResult<GeneratedAsset> {
  if (config.title.trim().length === 0) {
    return [assetError('empty_title', 'Cannot generate logo: title is empty'), null]
  }

  return [
    null,
    {
      filename: 'logo.svg',
      content: composeLogo({ title: config.title }),
    },
  ]
}

/**
 * Generate an icon (favicon) SVG from the project config.
 *
 * @param config - Title (first character is used for the icon glyph)
 * @returns Result containing the generated asset or an error
 */
export function generateIconSvg(config: AssetConfig): AssetResult<GeneratedAsset> {
  if (config.title.trim().length === 0) {
    return [assetError('empty_title', 'Cannot generate icon: title is empty'), null]
  }

  return [
    null,
    {
      filename: 'icon.svg',
      content: composeIcon({ title: config.title }),
    },
  ]
}

interface GenerateAssetsParams {
  readonly config: AssetConfig
  readonly publicDir: string
}

/**
 * Generate banner, logo, and icon SVGs, writing them to the public directory.
 *
 * For each asset:
 * 1. If the file is missing or has the zpress-generated marker → write it
 * 2. If the file exists without the marker → skip (user-customized)
 *
 * @param params - Config and target directory
 * @returns Result containing the list of filenames written, or an error
 */
export async function generateAssets(
  params: GenerateAssetsParams
): Promise<AssetResult<readonly string[]>> {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- publicDir comes from trusted Paths config
  const mkdirResult = await fs
    .mkdir(params.publicDir, { recursive: true })
    .then(() => null)
    .catch(toError)

  if (mkdirResult) {
    return [assetError('mkdir_failed', `Failed to create public dir: ${mkdirResult.message}`), null]
  }

  const generators: readonly (() => AssetResult<GeneratedAsset>)[] = [
    () => generateBannerSvg(params.config),
    () => generateLogoSvg(params.config),
    () => generateIconSvg(params.config),
  ]

  const results = await Promise.all(
    generators.map(async (generate) => {
      const [err, asset] = generate()
      if (err) {
        return null
      }

      const filePath = path.resolve(params.publicDir, asset.filename)
      const shouldWrite = await shouldGenerate(filePath, asset.content)
      if (!shouldWrite) {
        return null
      }

      const [writeErr, filename] = await writeAsset({ asset, publicDir: params.publicDir })
      if (writeErr) {
        return null
      }

      return filename
    })
  )

  const written = results.filter((f): f is string => f !== null)

  return [null, written]
}

// ---------------------------------------------------------------------------
// Private
// ---------------------------------------------------------------------------

/**
 * Determine whether a file should be (re)generated.
 *
 * Returns `true` when:
 * - The file does not exist (first generation)
 * - The file exists with the generated marker and content differs from `newContent`
 *
 * Returns `false` when:
 * - The file exists without the marker (user-customized)
 * - The file exists with the marker but content is identical to `newContent`
 *
 * @private
 * @param filePath - Absolute path to the file to check
 * @param newContent - The content that would be written
 * @returns Whether the file should be (re)generated
 */
async function shouldGenerate(filePath: string, newContent: string): Promise<boolean> {
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- path is constructed from trusted publicDir + known filenames
  const existing = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (existing === null) {
    return true
  }
  const normalized = existing.replaceAll('\r\n', '\n')
  const [firstLine] = normalized.split('\n')
  if (firstLine !== GENERATED_MARKER) {
    return false
  }
  if (normalized === newContent) {
    return false
  }
  return true
}

interface WriteAssetParams {
  readonly asset: GeneratedAsset
  readonly publicDir: string
}

/**
 * Write a generated asset to disk, returning either the filename or an error.
 *
 * @private
 * @param params - Asset and target directory
 * @returns Result containing the written filename or a write error
 */
async function writeAsset(params: WriteAssetParams): Promise<AssetResult<string>> {
  const filePath = path.resolve(params.publicDir, params.asset.filename)
  // oxlint-disable-next-line security/detect-non-literal-fs-filename -- path is constructed from trusted publicDir + known filenames
  const writeResult = await fs
    .writeFile(filePath, params.asset.content, 'utf8')
    .then(() => null)
    .catch(toError)

  if (writeResult) {
    return [
      assetError(
        'write_failed',
        `Failed to write ${params.asset.filename}: ${writeResult.message}`
      ),
      null,
    ]
  }

  return [null, params.asset.filename]
}
