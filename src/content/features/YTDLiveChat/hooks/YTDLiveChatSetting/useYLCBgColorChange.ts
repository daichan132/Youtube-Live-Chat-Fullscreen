import { useCallback } from 'react'

import { useYTDLiveChatNoLsStore } from '@/stores'
import { darkenRgbaColor } from '../../utils/darkenRgbaColor'

import type { RGBColor } from 'react-color'

const propertyList: string[] = ['--yt-live-chat-background-color']
const propertyListDarken = [
  { property: '--yt-spec-icon-disabled', amount: 40 },
  { property: '--yt-live-chat-vem-background-color', amount: 20 },
]
const propertyListTransparent = [
  '--yt-live-chat-header-background-color',
  '--yt-spec-general-background-b',
  '--yt-live-chat-action-panel-background-color',
  '--yt-live-chat-banner-gradient-scrim',
  '--yt-live-chat-action-panel-gradient-scrim',
  '--yt-live-chat-message-highlight-background-color',
]

export const useYLCBgColorChange = () => {
  const changeIframeBackgroundColor = useCallback((rgba: RGBColor) => {
    const iframeElement = useYTDLiveChatNoLsStore.getState().iframeElement
    const iframeDocument = iframeElement?.contentDocument?.documentElement
    if (!iframeDocument) return
    for (const property of propertyList) {
      iframeDocument.style.setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`)
    }
    for (const item of propertyListDarken) {
      iframeDocument.style.setProperty(item.property, darkenRgbaColor(rgba, item.amount))
    }
    for (const property of propertyListTransparent) {
      iframeDocument.style.setProperty(property, 'transparent')
    }
  }, [])
  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeBackgroundColor(rgba)
    },
    [changeIframeBackgroundColor],
  )
  return { changeColor }
}
