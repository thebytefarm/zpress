import type { ZpressConfig } from '@zpress/config'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock(import('./rspress.ts'), () => ({
  buildSiteForCheck: vi.fn<() => void>(),
}))

const { runConfigCheck, presentResults } = await import('./check.ts')

const validConfig = { sections: [{ title: 'Test' }] } as unknown as ZpressConfig

const loadError = {
  _tag: 'ConfigError' as const,
  type: 'not_found' as const,
  message: 'Config not found',
}

const mockLogger = {
  success: vi.fn<(msg: string) => void>(),
  error: vi.fn<(msg: string) => void>(),
  warn: vi.fn<(msg: string) => void>(),
  message: vi.fn<(msg: string) => void>(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runConfigCheck()', () => {
  it('should return passed: false with loadError when loadError is provided', () => {
    const result = runConfigCheck({ config: null, loadError })
    expect(result.passed).toBe(false)
    expect(result.errors).toContain(loadError)
  })

  it('should return passed: false with empty_sections error when config is null', () => {
    const result = runConfigCheck({ config: null, loadError: null })
    expect(result.passed).toBe(false)
    expect(result.errors[0]).toMatchObject({ type: 'empty_sections' })
  })

  it('should return passed: true with empty errors when config is valid', () => {
    const result = runConfigCheck({ config: validConfig, loadError: null })
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})

describe('presentResults()', () => {
  it('should return true when both config passed and build passed', () => {
    const result = presentResults({
      configResult: { passed: true, errors: [], warnings: [] },
      buildResult: { status: 'passed' },
      logger: mockLogger,
    })
    expect(result).toBe(true)
  })

  it('should return false when config failed', () => {
    const result = presentResults({
      configResult: { passed: false, errors: [loadError], warnings: [] },
      buildResult: { status: 'passed' },
      logger: mockLogger,
    })
    expect(result).toBe(false)
  })

  it('should return false when build has deadlinks', () => {
    const result = presentResults({
      configResult: { passed: true, errors: [], warnings: [] },
      buildResult: {
        status: 'failed',
        deadlinks: [{ file: 'docs/page.md', links: ['/missing'] }],
      },
      logger: mockLogger,
    })
    expect(result).toBe(false)
  })

  it('should call logger.success when config is valid', () => {
    presentResults({
      configResult: { passed: true, errors: [], warnings: [] },
      buildResult: { status: 'passed' },
      logger: mockLogger,
    })
    expect(mockLogger.success).toHaveBeenCalledWith('Config valid')
  })

  it('should call logger.error when config failed', () => {
    presentResults({
      configResult: { passed: false, errors: [loadError], warnings: [] },
      buildResult: { status: 'skipped' },
      logger: mockLogger,
    })
    expect(mockLogger.error).toHaveBeenCalledWith('Config validation failed:')
  })
})
