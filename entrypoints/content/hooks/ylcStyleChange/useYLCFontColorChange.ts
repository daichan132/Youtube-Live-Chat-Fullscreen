import { useCallback } from 'react'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'
import { YLC_FONT_COLOR_LIGHT_PROPERTIES, YLC_FONT_COLOR_PROPERTIES } from './ylcStyleConstants'

const toRgbaString = (rgba: RGBColor, alpha: number | undefined) => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${alpha})`

export const useYLCFontColorChange = () => {
  const { setProperties } = useYLCStylePropertyChange()

  const changeColor = useCallback(
    (rgba: RGBColor) => {
      const primary = toRgbaString(rgba, rgba.a)
      const secondaryAlpha = Math.max(0, (rgba.a ?? 0) - 0.4)
      const secondary = toRgbaString(rgba, secondaryAlpha)
      const properties: Array<readonly [string, string]> = [
        ...YLC_FONT_COLOR_PROPERTIES.map(property => [property, primary] as const),
        ...YLC_FONT_COLOR_LIGHT_PROPERTIES.map(property => [property, secondary] as const),
      ]

      setProperties(properties)
    },
    [setProperties],
  )

  return { changeColor }
}
