import path from 'node:path'

import type { Paths } from '@zpress/config'

export type { Paths }

/**
 * Create all derived project paths from a resolved directory.
 *
 * @param dir - Directory path to resolve as the repo root
 * @returns All derived project paths under the `.zpress/` output root
 */
export function createPaths(dir: string): Paths {
  const repoRoot = path.resolve(dir)
  const outputRoot = path.resolve(repoRoot, '.zpress')
  return {
    repoRoot,
    outputRoot,
    contentDir: path.resolve(outputRoot, 'content'),
    publicDir: path.resolve(outputRoot, 'public'),
    distDir: path.resolve(outputRoot, 'dist'),
    cacheDir: path.resolve(outputRoot, 'cache'),
  }
}
