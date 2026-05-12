/*
|==========================================================================
| Banner
|==========================================================================
|
| Styled zpress logo banner using cfonts block font with the active
| theme's brand gradient. Color stops come from `@zpress/theme` so the
| TUI stays in sync with the docs site and SVG assets.
|
*/

import { resolveBrandGradient } from '@zpress/theme'
import BigText from 'ink-big-text'
import Gradient from 'ink-gradient'

/**
 * Render the zpress logo banner with the base theme's brand gradient.
 *
 * @returns React element with the styled zpress banner
 */
export function Banner(): React.ReactElement {
  const colors = resolveBrandGradient('base')
  return (
    <Gradient colors={[...colors]}>
      <BigText text="zpress" font="block" />
    </Gradient>
  )
}
