import { BUILT_IN_THEMES } from '@zpress/theme'

import { readCss } from './head/read.ts'

/**
 * Theme CSS injected inline in <head> to prevent FOUC.
 *
 * Contains the :root fallback variables needed for initial paint
 * and the loading overlay styles.
 */

const THEME_CSS_MAP: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.keys(BUILT_IN_THEMES).map((name) => [name, readCss(`css/themes/${name}.css`)])
  )
)

const BACKDROP_CSS = readCss('css/loader-backdrop.css')
const DOTS_LOADER_CSS = readCss('css/loader-dots.css')
const LOADER_CSS = BACKDROP_CSS + DOTS_LOADER_CSS

/**
 * Generate inline CSS for a given theme.
 *
 * Always includes the loading overlay CSS. For built-in themes, also includes
 * the theme-specific color variables for correct first paint. Custom themes
 * should provide their own :root fallback in their external CSS.
 *
 * @param themeName - Name of the active theme
 * @returns Inline CSS string to inject in the document head
 */
export function getThemeCss(themeName: string): string {
  if (!Object.hasOwn(THEME_CSS_MAP, themeName)) {
    return LOADER_CSS
  }
  const themeColors = THEME_CSS_MAP[themeName]
  if (themeColors) {
    return themeColors + LOADER_CSS
  }
  return LOADER_CSS
}
