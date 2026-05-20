import { describe, it, expect } from 'vitest'

import { resolveIcon, resolveOptionalIcon } from './icon'

describe('resolveIcon()', () => {
  it('should return id with default purple color when given a string', () => {
    const result = resolveIcon('devicon:react')
    expect(result).toStrictEqual({ id: 'devicon:react', color: 'purple' })
  })

  it('should return id and color passthrough when given an object', () => {
    const result = resolveIcon({ id: 'devicon:react', color: 'blue' })
    expect(result).toStrictEqual({ id: 'devicon:react', color: 'blue' })
  })
})

describe('resolveOptionalIcon()', () => {
  it('should return undefined when given no icon', () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- testing undefined input explicitly
    const result = resolveOptionalIcon(undefined)
    expect(result).toBeUndefined()
  })

  it('should delegate to resolveIcon and return resolved icon when given a string', () => {
    const result = resolveOptionalIcon('devicon:react')
    expect(result).toStrictEqual({ id: 'devicon:react', color: 'purple' })
  })

  it('should delegate to resolveIcon and return resolved icon when given an object', () => {
    const result = resolveOptionalIcon({ id: 'devicon:react', color: 'blue' })
    expect(result).toStrictEqual({ id: 'devicon:react', color: 'blue' })
  })
})
