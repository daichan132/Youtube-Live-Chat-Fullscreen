import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/shared/stores'

import type { RGBColor } from 'react-color'

const propertyList: string[] = ['--extension-yt-live-font-color']

const propertyLightList: string[] = ['--extension-yt-live-secondary-font-color']

export const useYLCFontColorChange = () => {
  const changeIframeFontColor = useCallback((rgba: RGBColor) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    const iframeDocument = iframeElement?.contentDocument?.documentElement
    if (!iframeDocument) return
    for (const property of propertyList) {
      iframeDocument.style.setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`)
    }
    for (const property of propertyLightList) {
      iframeDocument.style.setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${Math.max(0, (rgba.a || 0) - 0.4)})`)
    }
  }, [])
  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeFontColor(rgba)
    },
    [changeIframeFontColor],
  )
  return { changeColor }
}
