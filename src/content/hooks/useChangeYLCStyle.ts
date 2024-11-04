import { useCallback } from 'react'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { useYLCBgColorChange } from './ylcStyleChange/useYLCBgColorChange'
import { useYLCFontColorChange } from './ylcStyleChange/useYLCFontColorChange'
import { useYLCFontFamilyChange } from './ylcStyleChange/useYLCFontFamilyChange'
import { useYLCFontSizeChange } from './ylcStyleChange/useYLCFontSizeChange'
import { useYLCReactionButtonDisplayChange } from './ylcStyleChange/useYLCReactionButtonDisplayChange'
import { useYLCSpaceChange } from './ylcStyleChange/useYLCSpaceChange'
import { useYLCSuperChatBarDisplayChange } from './ylcStyleChange/useYLCSuperChatBarDisplayChange'
import { useYLCUserIconDisplayChange } from './ylcStyleChange/useYLCUserIconDisplayChange'
import { useYLCUserNameDisplayChange } from './ylcStyleChange/useYLCUserNameDisplayChange'

export const useChangeYLCStyle = () => {
  const { changeColor: changBgColor } = useYLCBgColorChange()
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
