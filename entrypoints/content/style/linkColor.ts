import type { RGBA } from '@/shared/settings/model'
import { contrast, luminance } from './colorContrast'

type RGB = Pick<RGBA, 'r' | 'g' | 'b'>

const DEEP_BLUE = { r: 3, g: 66, b: 148 } as const
const PALE_BLUE = { r: 151, g: 204, b: 255 } as const
const DEEP_NAVY = { r: 0, g: 0, b: 16 } as const
const PALEST_BLUE = { r: 250, g: 253, b: 255 } as const
const MINIMUM_CONTRAST = 4.5

const compositeOver = (background: RGBA, videoChannel: number): RGB => ({
  r: background.r * background.a + videoChannel * (1 - background.a),
  g: background.g * background.a + videoChannel * (1 - background.a),
  b: background.b * background.a + videoChannel * (1 - background.a),
})

/** Choose readable blue text without changing native semantic button colors. */
export const getChatLinkColor = (background: RGBA, foreground: RGBA): RGBA => {
  // With no chat fill, the moving video has no known background color. Follow
  // the user's chosen ink direction; no single color can cover every frame.
  if (background.a === 0) return { ...(luminance(foreground) >= 0.5 ? PALE_BLUE : DEEP_BLUE), a: 1 }

  const darkestBackground = compositeOver(background, 0)
  const lightestBackground = compositeOver(background, 255)
  const worstContrast = (candidate: RGB) => Math.min(contrast(candidate, darkestBackground), contrast(candidate, lightestBackground))
  let chosen: RGB = worstContrast(PALE_BLUE) > worstContrast(DEEP_BLUE) ? PALE_BLUE : DEEP_BLUE
  // Preserve the usual blue accents when readable. Mid-tone custom surfaces
  // need near-black navy or near-white blue to avoid two equally weak choices.
  if (worstContrast(chosen) < MINIMUM_CONTRAST) {
    for (const fallback of [DEEP_NAVY, PALEST_BLUE]) {
      if (worstContrast(fallback) > worstContrast(chosen)) chosen = fallback
    }
  }
  return { ...chosen, a: 1 }
}
