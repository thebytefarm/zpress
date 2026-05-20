import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { createPaths } from './paths'

describe('createPaths()', () => {
  it('should set repoRoot to resolved path', () => {
    const paths = createPaths('/project')
    expect(paths.repoRoot).toBe(path.resolve('/project'))
  })

  it('should set outputRoot ending with .zpress', () => {
    const paths = createPaths('/project')
    expect(paths.outputRoot).toMatch(/\.zpress$/)
  })

  it('should set contentDir under outputRoot', () => {
    const paths = createPaths('/project')
    expect(paths.contentDir.startsWith(paths.outputRoot)).toBe(true)
  })

  it('should set all paths as absolute', () => {
    const paths = createPaths('/project')
    expect(path.isAbsolute(paths.repoRoot)).toBe(true)
    expect(path.isAbsolute(paths.outputRoot)).toBe(true)
    expect(path.isAbsolute(paths.contentDir)).toBe(true)
    expect(path.isAbsolute(paths.publicDir)).toBe(true)
    expect(path.isAbsolute(paths.distDir)).toBe(true)
    expect(path.isAbsolute(paths.cacheDir)).toBe(true)
  })
})
