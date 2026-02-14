import { useShallow } from 'zustand/react/shallow'

import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const AlwaysOnDisplaySwitch = () => {
  const { alwaysOnDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  return <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} updateYLCStyle={updateYLCStyle} />
}

export const AlwaysOnDisplaySwitchUI = ({
  alwaysOnDisplay,
  updateYLCStyle,
}: {
  alwaysOnDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
}) => {
  return (
    <SettingSwitch
      checked={alwaysOnDisplay}
      aria-label='Always on display'
      onChange={checked => {
        updateYLCStyle?.({ alwaysOnDisplay: checked })
      }}
    />
  )
}
