import { useCallback } from 'react'

import { useYLCBgColorChange } from '../YTDLiveChatSetting/useYLCBgColorChange'
import { useYLCFontColorChange } from '../YTDLiveChatSetting/useYLCFontColorChange'
import { useYLCFontFamilyChange } from '../YTDLiveChatSetting/useYLCFontFamilyChange'
import { useYLCFontSizeChange } from '../YTDLiveChatSetting/useYLCFontSizeChange'
import { useYLCReactionButtonDisplayChange } from '../YTDLiveChatSetting/useYLCReactionButtonDisplayChange'
import { useYLCSpaceChange } from '../YTDLiveChatSetting/useYLCSpaceChange'
import { useYLCSuperChatBarDisplayChange } from '../YTDLiveChatSetting/useYLCSuperChatBarDisplayChange'
import { useYLCUserIconDisplayChange } from '../YTDLiveChatSetting/useYLCUserIconDisplayChange'
import { useYLCUserNameDisplayChange } from '../YTDLiveChatSetting/useYLCUserNameDisplayChange'

import type { YLCStyleUpdateType } from '../../../../../types/ytdLiveChatType'

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
