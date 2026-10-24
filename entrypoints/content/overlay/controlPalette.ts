import type { RGBA } from '@/shared/settings/model'
import { contrast, luminance } from '../style/colorContrast'

type RGB = Pick<RGBA, 'r' | 'g' | 'b'>
const rgba = ({ r, g, b }: RGB, a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

/** Follow chat hues while keeping recovery controls usable over moving video. */
export const getControlPalette = (backgroundColor: RGBA, fontColor: RGBA) => {
  const background = backgroundColor
  const worstContrast = (color: RGB) =>
    contrast(color, {
      r: background.r * 0.9 + color.r * 0.1,
      g: background.g * 0.9 + color.g * 0.1,
      b: background.b * 0.9 + color.b * 0.1,
    })
  let ink: RGB = fontColor
  if (worstContrast(ink) < 3) {
    const channel = luminance(background) > 0.179 ? 0 : 255
    ink = { r: channel, g: channel, b: channel }
  }
  return {
    '--ylc-overlay-control-rail-bg': rgba(background),
    '--ylc-overlay-control-ink': rgba(ink),
    '--ylc-overlay-control-hover': rgba(ink, 0.1),
  }
}
