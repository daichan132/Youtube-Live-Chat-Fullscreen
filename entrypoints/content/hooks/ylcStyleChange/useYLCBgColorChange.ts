import { darkenRgbaColor } from '@/entrypoints/content/utils/darkenRgbaColor'
import { useCallback } from 'react'
import type { RGBColor } from 'react-color'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

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
  const { setProperty } = useYLCStylePropertyChange()

  const changeIframeBackgroundColor = useCallback(
    (rgba: RGBColor) => {
      for (const property of propertyList) {
        setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`)
      }
      for (const item of propertyListDarken) {
        setProperty(item.property, darkenRgbaColor(rgba, item.amount))
      }
      for (const property of propertyListTransparent) {
        setProperty(property, 'transparent')
      }
    },
    [setProperty],
  )

  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeBackgroundColor(rgba)
    },
    [changeIframeBackgroundColor],
  )

  return { changeColor }
}
