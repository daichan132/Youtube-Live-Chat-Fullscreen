import { useShallow } from 'zustand/react/shallow'

import { useYLCSuperChatBarDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCSuperChatBarDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const SuperChatBarDisplaySwitch = () => {
  const { superChatBarDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      superChatBarDisplay: state.superChatBarDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCSuperChatBarDisplayChange()
  return (
    <SuperChatBarDisplaySwitchUI superChatBarDisplay={superChatBarDisplay} updateYLCStyle={updateYLCStyle} changeDisplay={changeDisplay} />
  )
}

export const SuperChatBarDisplaySwitchUI = ({
  superChatBarDisplay,
  updateYLCStyle,
  changeDisplay,
}: {
  superChatBarDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
  changeDisplay?: (superChatBarDisplay: boolean) => void
}) => {
  return (
    <SettingSwitch
      checked={superChatBarDisplay}
      aria-label='Super chat bar display'
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ superChatBarDisplay: checked })
      }}
    />
  )
}
