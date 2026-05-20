import { describe, it, expect } from 'vitest'

import { defineConfig } from './define-config.ts'
import { validateConfig } from './validator.ts'

const validConfig = {
  sections: [{ title: 'Test', path: '/test', content: '# Test' }],
}

describe('validateConfig()', () => {
  it('should return [null, config] for valid config', () => {
    const [error, config] = validateConfig(validConfig)
    expect(error).toBeNull()
    expect(config).not.toBeNull()
  })

  it('should return config with sections for valid input', () => {
    const [, config] = validateConfig(validConfig)
    if (config) {
      expect(config.sections).toHaveLength(1)
    }
  })

  it('should return [error, null] for invalid config', () => {
    const [error, config] = validateConfig({})
    expect(error).not.toBeNull()
    expect(config).toBeNull()
  })

  it('should return error with type validation_failed for invalid config', () => {
    const [error] = validateConfig({})
    expect(error).toMatchObject({ type: 'validation_failed' })
  })

  it('should return error when sections array is empty', () => {
    const [error] = validateConfig({ sections: [] })
    expect(error).toMatchObject({ type: 'validation_failed' })
  })
})

describe('defineConfig()', () => {
  it('should return the same config object passed in', () => {
    const config = defineConfig(validConfig)
    expect(config).toBe(validConfig)
  })
})
