import { useCallback, useMemo } from 'react'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { useYLCBgColorChange } from './useYLCBgColorChange'
import { useYLCBlurChange } from './useYLCBlurChange'
import { useYLCFontColorChange } from './useYLCFontColorChange'
import { useYLCFontFamilyChange } from './useYLCFontFamilyChange'
import { useYLCFontSizeChange } from './useYLCFontSizeChange'
import { useYLCReactionButtonDisplayChange } from './useYLCReactionButtonDisplayChange'
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
  'reactionButtonDisplay',
  'superChatBarDisplay',
] as const

type HandledKey = (typeof HANDLED_KEYS)[number]
type HandlerMap = {
  [Key in HandledKey]: (value: NonNullable<YLCStyleUpdateType[Key]>) => void
}

export const useChangeYLCStyle = () => {
  const { changeColor: changBgColor } = useYLCBgColorChange()
  const { changeBlur } = useYLCBlurChange()
  const { changeColor: changFontColor } = useYLCFontColorChange()
  const { changeFontFamily } = useYLCFontFamilyChange()
  const { changeFontSize } = useYLCFontSizeChange()
  const { changeSpace } = useYLCSpaceChange()
  const { changeDisplay: changeUserNameDisplay } = useYLCUserNameDisplayChange()
  const { changeDisplay: changeUserIconDisplay } = useYLCUserIconDisplayChange()
  const { changeDisplay: changeReactionButtonDisplay } = useYLCReactionButtonDisplayChange()
  const { changeDisplay: changeSuperChatBarDisplay } = useYLCSuperChatBarDisplayChange()

  const handlers: HandlerMap = useMemo(
    () => ({
      bgColor: changBgColor,
      blur: changeBlur,
      fontColor: changFontColor,
      fontFamily: changeFontFamily,
      fontSize: changeFontSize,
      space: changeSpace,
      userNameDisplay: changeUserNameDisplay,
      userIconDisplay: changeUserIconDisplay,
      reactionButtonDisplay: changeReactionButtonDisplay,
      superChatBarDisplay: changeSuperChatBarDisplay,
    }),
    [
      changBgColor,
      changeBlur,
      changFontColor,
      changeFontFamily,
      changeFontSize,
      changeSpace,
      changeUserNameDisplay,
      changeUserIconDisplay,
      changeReactionButtonDisplay,
      changeSuperChatBarDisplay,
    ],
  )

  const changeYLCStyle = useCallback(
    (update: YLCStyleUpdateType) => {
      const apply = <Key extends HandledKey>(key: Key, value: YLCStyleUpdateType[Key]) => {
        if (value === undefined) return
        handlers[key](value)
      }

      for (const key of HANDLED_KEYS) {
        apply(key, update[key])
      }
    },
    [handlers],
  )

  return changeYLCStyle
}
