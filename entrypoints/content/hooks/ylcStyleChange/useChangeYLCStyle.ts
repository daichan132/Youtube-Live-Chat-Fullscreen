import { useCallback } from 'react'

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
  const changeYLCStyle = useCallback(
    ({
      bgColor,
      blur,
      fontColor,
      fontFamily,
      fontSize,
      space,
      userNameDisplay,
      userIconDisplay,
      reactionButtonDisplay,
      superChatBarDisplay,
    }: YLCStyleUpdateType) => {
      if (bgColor !== undefined) changBgColor(bgColor)
      if (blur !== undefined) changeBlur(blur)
      if (fontColor !== undefined) changFontColor(fontColor)
      if (fontFamily !== undefined) changeFontFamily(fontFamily)
      if (fontSize !== undefined) changeFontSize(fontSize)
      if (space !== undefined) changeSpace(space)
      if (userNameDisplay !== undefined) changeUserNameDisplay(userNameDisplay)
      if (userIconDisplay !== undefined) changeUserIconDisplay(userIconDisplay)
      if (reactionButtonDisplay !== undefined) changeReactionButtonDisplay(reactionButtonDisplay)
      if (superChatBarDisplay !== undefined) changeSuperChatBarDisplay(superChatBarDisplay)
    },
    [
      changBgColor,
      changeBlur,
      changFontColor,
      changeFontFamily,
      changeFontSize,
      changeReactionButtonDisplay,
      changeSpace,
      changeUserIconDisplay,
      changeUserNameDisplay,
      changeSuperChatBarDisplay,
    ],
  )

  return changeYLCStyle
}
