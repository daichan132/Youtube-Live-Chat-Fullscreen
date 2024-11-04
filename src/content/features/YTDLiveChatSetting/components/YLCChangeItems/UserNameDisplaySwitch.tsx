import React from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/content/../shared/components/Switch'
import { useYLCUserNameDisplayChange } from '@/content/hooks/ylcStyleChange/useYLCUserNameDisplayChange'
import { useYTDLiveChatStore } from '@/stores'

import type { YLCStyleUpdateType } from '@/types/ytdLiveChatType'

export const UserNameDisplaySwitch = () => {
  const { userNameDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      userNameDisplay: state.userNameDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCUserNameDisplayChange()
  return (
    <UserNameDisplaySwitchUI
      userNameDisplay={userNameDisplay}
      updateYLCStyle={updateYLCStyle}
      changeDisplay={changeDisplay}
    />
  )
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
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={userNameDisplay}
        id='user-name-display-switch'
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ userNameDisplay: checked })
        }}
      />
    </div>
  )
}
