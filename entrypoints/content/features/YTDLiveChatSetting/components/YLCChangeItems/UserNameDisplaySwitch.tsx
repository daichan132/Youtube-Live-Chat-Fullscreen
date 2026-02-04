import { useShallow } from 'zustand/react/shallow'

import { useYLCUserNameDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCUserNameDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const UserNameDisplaySwitch = () => {
  const { userNameDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      userNameDisplay: state.userNameDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCUserNameDisplayChange()
  return <UserNameDisplaySwitchUI userNameDisplay={userNameDisplay} updateYLCStyle={updateYLCStyle} changeDisplay={changeDisplay} />
}

export const UserNameDisplaySwitchUI = ({
  userNameDisplay,
  updateYLCStyle,
  changeDisplay,
}: {
  userNameDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
  changeDisplay?: (userNameDisplay: boolean) => void
}) => {
  return (
    <SettingSwitch
      checked={userNameDisplay}
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ userNameDisplay: checked })
      }}
    />
  )
}
