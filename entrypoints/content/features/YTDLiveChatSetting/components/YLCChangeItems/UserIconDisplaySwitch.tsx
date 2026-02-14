import { useShallow } from 'zustand/react/shallow'

import { useYLCUserIconDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCUserIconDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const UserIconDisplaySwitch = () => {
  const { userIconDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      userIconDisplay: state.userIconDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCUserIconDisplayChange()
  return <UserIconDisplaySwitchUI userIconDisplay={userIconDisplay} updateYLCStyle={updateYLCStyle} changeDisplay={changeDisplay} />
}

export const UserIconDisplaySwitchUI = ({
  userIconDisplay,
  updateYLCStyle,
  changeDisplay,
}: {
  userIconDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
  changeDisplay?: (userIconDisplay: boolean) => void
}) => {
  return (
    <SettingSwitch
      checked={userIconDisplay}
      aria-label='User icon display'
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ userIconDisplay: checked })
      }}
    />
  )
}
