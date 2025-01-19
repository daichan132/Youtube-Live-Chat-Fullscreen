import type { RGBColor } from 'react-color'

export const darkenRgbaColor = (rgba: RGBColor, amount: number) => {
  let r = rgba.r
  let g = rgba.g
  let b = rgba.b
  const a = rgba.a
  r = Math.max(0, r - amount)
  g = Math.max(0, g - amount)
  b = Math.max(0, b - amount)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
