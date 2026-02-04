import { useCallback } from 'react'
import type { RGBColor } from 'react-color'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

const propertyList: string[] = ['--extension-yt-live-font-color']

const propertyLightList: string[] = ['--extension-yt-live-secondary-font-color']

export const useYLCFontColorChange = () => {
  const { setProperty } = useYLCStylePropertyChange()

  const changeColor = useCallback(
    (rgba: RGBColor) => {
      for (const property of propertyList) {
        setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`)
      }

      for (const property of propertyLightList) {
        setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${Math.max(0, (rgba.a || 0) - 0.4)})`)
      }
    },
    [setProperty],
  )

  return { changeColor }
}
