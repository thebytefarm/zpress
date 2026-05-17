import { describe, it, expect } from 'vitest'

import {
  COLOR_MODES,
  ICON_COLORS,
  THEME_NAMES,
  THEME_VARIANTS,
  isBuiltInIconColor,
  isBuiltInTheme,
  resolveDefaultColorMode,
  resolveDefaultVariant,
  resolveThemeModes,
  resolveThemeVariants,
} from './definitions.ts'

describe('THEME_NAMES constant', () => {
  it('should contain exactly the built-in theme names', () => {
    expect(THEME_NAMES).toStrictEqual(['default', 'midnight', 'arcade'])
  })

  it('should have exactly 3 entries', () => {
    expect(THEME_NAMES).toHaveLength(3)
  })
})

describe('THEME_VARIANTS constant', () => {
  it('should contain exactly the supported variants', () => {
    expect(THEME_VARIANTS).toStrictEqual(['dark', 'light'])
  })

  it('should be aliased by the deprecated COLOR_MODES export', () => {
    expect(COLOR_MODES).toStrictEqual(THEME_VARIANTS)
  })
})

describe('ICON_COLORS constant', () => {
  it('should contain exactly the 8 built-in icon colors', () => {
    expect(ICON_COLORS).toStrictEqual([
      'purple',
      'blue',
      'green',
      'amber',
      'cyan',
      'red',
      'pink',
      'slate',
    ])
  })

  it('should have exactly 8 entries', () => {
    expect(ICON_COLORS).toHaveLength(8)
  })
})

describe('isBuiltInTheme()', () => {
  it('should return true for default', () => {
    expect(isBuiltInTheme('default')).toBe(true)
  })

  it('should return true for midnight', () => {
    expect(isBuiltInTheme('midnight')).toBe(true)
  })

  it('should return true for arcade', () => {
    expect(isBuiltInTheme('arcade')).toBe(true)
  })

  it('should return false for the legacy base name', () => {
    expect(isBuiltInTheme('base')).toBe(false)
  })

  it('should return false for an unknown theme name', () => {
    expect(isBuiltInTheme('unknown')).toBe(false)
  })

  it('should return false for an empty string', () => {
    expect(isBuiltInTheme('')).toBe(false)
  })
})

describe('isBuiltInIconColor()', () => {
  it('should return true for purple', () => {
    expect(isBuiltInIconColor('purple')).toBe(true)
  })

  it('should return true for blue', () => {
    expect(isBuiltInIconColor('blue')).toBe(true)
  })

  it('should return false for an unknown color', () => {
    expect(isBuiltInIconColor('orange')).toBe(false)
  })

  it('should return false for an empty string', () => {
    expect(isBuiltInIconColor('')).toBe(false)
  })
})

describe('resolveDefaultVariant()', () => {
  it('should return dark for default', () => {
    expect(resolveDefaultVariant('default')).toBe('dark')
  })

  it('should return dark for midnight', () => {
    expect(resolveDefaultVariant('midnight')).toBe('dark')
  })

  it('should return dark for arcade', () => {
    expect(resolveDefaultVariant('arcade')).toBe('dark')
  })

  it('should be aliased by the deprecated resolveDefaultColorMode export', () => {
    expect(resolveDefaultColorMode('default')).toBe('dark')
  })
})

describe('resolveThemeVariants()', () => {
  it('should return both variants for default', () => {
    expect(resolveThemeVariants('default')).toStrictEqual(['dark', 'light'])
  })

  it('should return only dark for midnight', () => {
    expect(resolveThemeVariants('midnight')).toStrictEqual(['dark'])
  })

  it('should return only dark for arcade', () => {
    expect(resolveThemeVariants('arcade')).toStrictEqual(['dark'])
  })

  it('should be aliased by the deprecated resolveThemeModes export', () => {
    expect(resolveThemeModes('default')).toStrictEqual(['dark', 'light'])
  })
})
