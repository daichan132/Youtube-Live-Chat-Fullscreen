import { useCallback } from 'react'
import { darkenRgbaColor } from '@/entrypoints/content/utils/darkenRgbaColor'
import type { RGBColor } from '@/shared/types/ytdLiveChatType'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'
import { YLC_BG_COLOR_PROPERTIES, YLC_BG_DARKEN_PROPERTIES, YLC_BG_TRANSPARENT_PROPERTIES } from './ylcStyleConstants'

export const useYLCBgColorChange = () => {
  const { setProperties } = useYLCStylePropertyChange()

  const changeColor = useCallback(
    (rgba: RGBColor) => {
      const properties: Array<readonly [string, string]> = [
        ...YLC_BG_COLOR_PROPERTIES.map(property => [property, 'transparent'] as const),
        ...YLC_BG_DARKEN_PROPERTIES.map(({ property, amount }) => [property, darkenRgbaColor(rgba, amount)] as const),
        ...YLC_BG_TRANSPARENT_PROPERTIES.map(property => [property, 'transparent'] as const),
      ]

      setProperties(properties)
    },
    [setProperties],
  )

  return { changeColor }
}
