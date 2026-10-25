import type { RGBA } from '@/shared/settings/model'

type RGB = Pick<RGBA, 'r' | 'g' | 'b'>

const toLinearChannel = (channel: number) => {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export const luminance = (color: RGB) =>
  0.2126 * toLinearChannel(color.r) + 0.7152 * toLinearChannel(color.g) + 0.0722 * toLinearChannel(color.b)

export const contrast = (foreground: RGB, background: RGB) => {
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}
