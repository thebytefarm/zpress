import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We need to mock os.tmpdir() to control the log directory
vi.mock(import('node:os'), async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, tmpdir: vi.fn<typeof original.tmpdir>(original.tmpdir) }
})

const os = await import('node:os')
const { reportCrash } = await import('./crash-reporter.ts')

describe('reportCrash()', () => {
  const testDir = mkdtempSync(join(tmpdir(), 'zpress-test-'))

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(os.tmpdir).mockReturnValue(testDir)
  })

  afterEach(() => {
    rmSync(join(testDir, 'zpress'), { recursive: true, force: true })
  })

  it('should return ok: true with a logPath when write succeeds', () => {
    const result = reportCrash({
      error: new Error('test crash'),
      source: 'middleware',
      version: '0.8.4',
    })

    expect(result.ok).toBe(true)
    expect(result.message).toBe('test crash')
    expect(result.logPath).toMatch(/\/zpress\/error-.*\.log$/)
    expect(result.error).toBeNull()
  })

  it('should write valid JSON to the log file', () => {
    const result = reportCrash({
      error: new Error('json check'),
      source: 'middleware',
      command: 'dev',
      args: { port: 6174 },
      version: '0.8.4',
    })

    expect(result.logPath).not.toBeNull()
    const contents = readFileSync(result.logPath as string, 'utf8')
    const report = JSON.parse(contents)

    expect(report.level).toBe('fatal')
    expect(report.source).toBe('middleware')
    expect(report.command).toBe('dev')
    expect(report.args).toStrictEqual({ port: 6174 })
    expect(report.error.name).toBe('Error')
    expect(report.error.message).toBe('json check')
    expect(report.error.stack).toBeDefined()
    expect(report.env.node).toBeDefined()
    expect(report.env.platform).toBeDefined()
    expect(report.env.arch).toBeDefined()
    expect(report.env.zpress).toBe('0.8.4')
  })

  it('should include command and args when provided', () => {
    const result = reportCrash({
      error: new Error('with context'),
      source: 'middleware',
      command: 'build',
      args: { clean: true, check: false },
      version: '0.8.4',
    })

    expect(result.logPath).not.toBeNull()
    const report = JSON.parse(readFileSync(result.logPath as string, 'utf8'))
    expect(report.command).toBe('build')
    expect(report.args).toStrictEqual({ clean: true, check: false })
  })

  it('should set command and args to null when not provided', () => {
    const result = reportCrash({
      error: new Error('no context'),
      source: 'uncaughtException',
      version: '0.8.4',
    })

    expect(result.logPath).not.toBeNull()
    const report = JSON.parse(readFileSync(result.logPath as string, 'utf8'))
    expect(report.command).toBeNull()
    expect(report.args).toBeNull()
  })

  it('should normalize non-Error values', () => {
    const result = reportCrash({
      error: 'string error',
      source: 'unhandledRejection',
      version: '0.8.4',
    })

    expect(result.ok).toBe(true)
    expect(result.message).toBe('string error')

    expect(result.logPath).not.toBeNull()
    const report = JSON.parse(readFileSync(result.logPath as string, 'utf8'))
    expect(report.error.name).toBe('Error')
    expect(report.error.message).toBe('string error')
  })

  it('should return ok: false when write fails', () => {
    // Point tmpdir at a path that cannot be written to
    vi.mocked(os.tmpdir).mockReturnValue('/nonexistent/readonly/path')

    const result = reportCrash({
      error: new Error('write fail'),
      source: 'middleware',
      version: '0.8.4',
    })

    expect(result.ok).toBe(false)
    expect(result.message).toBe('write fail')
    expect(result.logPath).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
  })

  it('should create unique log files for each crash', () => {
    const result1 = reportCrash({
      error: new Error('crash 1'),
      source: 'middleware',
      version: '0.8.4',
    })
    const result2 = reportCrash({
      error: new Error('crash 2'),
      source: 'middleware',
      version: '0.8.4',
    })

    expect(result1.logPath).not.toBeNull()
    expect(result2.logPath).not.toBeNull()
    expect(result1.logPath).not.toBe(result2.logPath)
    expect(existsSync(result1.logPath as string)).toBe(true)
    expect(existsSync(result2.logPath as string)).toBe(true)
  })
})
