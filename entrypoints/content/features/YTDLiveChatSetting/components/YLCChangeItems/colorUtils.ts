import type { RgbaColor } from 'react-colorful'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'

export const toRgba = (c: RGBColor): RgbaColor => ({ r: c.r, g: c.g, b: c.b, a: c.a ?? 1 })
export const fromRgba = (c: RgbaColor): RGBColor => ({ r: c.r, g: c.g, b: c.b, a: c.a })

export const getPreviewBorderColor = (rgba: RGBColor) => {
  const alpha = typeof rgba.a === 'number' ? rgba.a : 1
  const luminance = (0.2126 * rgba.r + 0.7152 * rgba.g + 0.0722 * rgba.b) / 255

  if (alpha < 0.35) {
    return 'var(--ylc-preview-border-muted)'
  }

  return luminance > 0.82 ? 'var(--ylc-preview-border-strong)' : 'var(--ylc-preview-border-soft)'
}
