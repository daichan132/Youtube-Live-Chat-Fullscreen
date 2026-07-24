import type { RgbaColor } from 'react-colorful'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'

export const toRgba = (c: RGBColor): RgbaColor => ({ r: c.r, g: c.g, b: c.b, a: c.a })
export const fromRgba = (c: RgbaColor): RGBColor => ({ r: c.r, g: c.g, b: c.b, a: c.a })

const toHexComponent = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')

export const formatColorValue = (rgba: RGBColor): string => {
  const hex = `#${toHexComponent(rgba.r)}${toHexComponent(rgba.g)}${toHexComponent(rgba.b)}`.toUpperCase()
  const alpha = rgba.a
  return alpha >= 1 ? hex : `${hex} · ${Math.round(alpha * 100)}%`
}

export const getPreviewBorderColor = (rgba: RGBColor) => {
  const alpha = rgba.a
  const luminance = (0.2126 * rgba.r + 0.7152 * rgba.g + 0.0722 * rgba.b) / 255

  if (alpha < 0.35) {
    return 'var(--ylc-preview-border-muted)'
  }

  return luminance > 0.82 ? 'var(--ylc-preview-border-strong)' : 'var(--ylc-preview-border-soft)'
}
