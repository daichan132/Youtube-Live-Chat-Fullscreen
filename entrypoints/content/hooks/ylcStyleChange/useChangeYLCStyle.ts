import { useCallback, useMemo } from 'react'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { useYLCBgColorChange } from './useYLCBgColorChange'
import { useYLCBlurChange } from './useYLCBlurChange'
import { useYLCFontColorChange } from './useYLCFontColorChange'
import { useYLCFontFamilyChange } from './useYLCFontFamilyChange'
import { useYLCFontSizeChange } from './useYLCFontSizeChange'
import { useYLCSpaceChange } from './useYLCSpaceChange'
import { useYLCSuperChatBarDisplayChange } from './useYLCSuperChatBarDisplayChange'
import { useYLCUserIconDisplayChange } from './useYLCUserIconDisplayChange'
import { useYLCUserNameDisplayChange } from './useYLCUserNameDisplayChange'

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
  const { changeFontSize } = useYLCFontSizeChange()
  const { changeSpace } = useYLCSpaceChange()
  const { changeDisplay: changeUserNameDisplay } = useYLCUserNameDisplayChange()
  const { changeDisplay: changeUserIconDisplay } = useYLCUserIconDisplayChange()
  const { changeDisplay: changeSuperChatBarDisplay } = useYLCSuperChatBarDisplayChange()

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
