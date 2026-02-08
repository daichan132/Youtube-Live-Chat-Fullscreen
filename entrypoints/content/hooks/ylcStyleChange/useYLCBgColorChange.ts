import { useCallback } from 'react'
import type { RGBColor } from 'react-color'
import { darkenRgbaColor } from '@/entrypoints/content/utils/darkenRgbaColor'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'
import { YLC_BG_COLOR_PROPERTIES, YLC_BG_DARKEN_PROPERTIES, YLC_BG_TRANSPARENT_PROPERTIES } from './ylcStyleConstants'

const toRgbaString = (rgba: RGBColor) => `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`

export const useYLCBgColorChange = () => {
  const { setProperties } = useYLCStylePropertyChange()

  const changeColor = useCallback(
    (rgba: RGBColor) => {
      const baseColor = toRgbaString(rgba)
      const properties: Array<readonly [string, string]> = [
        ...YLC_BG_COLOR_PROPERTIES.map(property => [property, baseColor] as const),
        ...YLC_BG_DARKEN_PROPERTIES.map(({ property, amount }) => [property, darkenRgbaColor(rgba, amount)] as const),
        ...YLC_BG_TRANSPARENT_PROPERTIES.map(property => [property, 'transparent'] as const),
      ]

      setProperties(properties)
    },
    [setProperties],
  )

  return { changeColor }
}
