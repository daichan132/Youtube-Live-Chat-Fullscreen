import { useCallback, useMemo } from 'react'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { useYLCBgColorChange } from './useYLCBgColorChange'
import { useYLCBlurChange } from './useYLCBlurChange'
import { useYLCDisplayChange } from './useYLCDisplayChange'
import { useYLCFontColorChange } from './useYLCFontColorChange'
import { useYLCFontFamilyChange } from './useYLCFontFamilyChange'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

const HANDLED_KEYS = [
  'bgColor',
  'blur',
  'fontColor',
  'fontFamily',
  'fontSize',
  'space',
  'userNameDisplay',
  'userIconDisplay',
  'superChatBarDisplay',
] as const

type HandledKey = (typeof HANDLED_KEYS)[number]
type HandlerMap = {
  [Key in HandledKey]: (value: NonNullable<YLCStyleUpdateType[Key]>) => void
}

const applyStyleChange = <Key extends HandledKey>(handlers: HandlerMap, update: YLCStyleUpdateType, key: Key) => {
  const value = update[key]
  if (value === undefined) return
  handlers[key](value)
}

export const useChangeYLCStyle = () => {
  const { changeColor: changeBgColor } = useYLCBgColorChange()
  const { changeBlur } = useYLCBlurChange()
  const { changeColor: changeFontColor } = useYLCFontColorChange()
  const { changeFontFamily } = useYLCFontFamilyChange()
  const { setProperty } = useYLCStylePropertyChange()
  const { changeDisplay: changeUserNameDisplay } = useYLCDisplayChange('--extension-user-name-display')
  const { changeDisplay: changeUserIconDisplay } = useYLCDisplayChange('--extension-user-icon-display')
  const { changeDisplay: changeSuperChatBarDisplay } = useYLCDisplayChange('--extension-super-chat-bar-display', 'block')

  const changeFontSize = useCallback(
    (fontSize: number) => {
      setProperty('--extension-yt-live-chat-font-size', `${fontSize}px`)
    },
    [setProperty],
  )

  const changeSpace = useCallback(
    (space: number) => {
      setProperty('--extension-yt-live-chat-spacing', `${space}px`)
    },
    [setProperty],
  )

  const handlers: HandlerMap = useMemo(
    () => ({
      bgColor: changeBgColor,
      blur: changeBlur,
      fontColor: changeFontColor,
      fontFamily: changeFontFamily,
      fontSize: changeFontSize,
      space: changeSpace,
      userNameDisplay: changeUserNameDisplay,
      userIconDisplay: changeUserIconDisplay,
      superChatBarDisplay: changeSuperChatBarDisplay,
    }),
    [
      changeBgColor,
      changeBlur,
      changeFontColor,
      changeFontFamily,
      changeFontSize,
      changeSpace,
      changeUserNameDisplay,
      changeUserIconDisplay,
      changeSuperChatBarDisplay,
    ],
  )

  const changeYLCStyle = useCallback(
    (update: YLCStyleUpdateType) => {
      for (const key of HANDLED_KEYS) {
        applyStyleChange(handlers, update, key)
      }
    },
    [handlers],
  )

  return changeYLCStyle
}
