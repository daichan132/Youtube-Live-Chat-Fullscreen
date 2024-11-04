import React from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useYLCUserIconDisplayChange } from '@/content/hooks/ylcStyleChange/useYLCUserIconDisplayChange'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/stores'

import type { YLCStyleUpdateType } from '@/types/ytdLiveChatType'

export const UserIconDisplaySwitch = () => {
  const { userIconDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      userIconDisplay: state.userIconDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCUserIconDisplayChange()
  return (
    <UserIconDisplaySwitchUI
      userIconDisplay={userIconDisplay}
      updateYLCStyle={updateYLCStyle}
      changeDisplay={changeDisplay}
    />
  )
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
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={userIconDisplay}
        id='user-icon-display-switch'
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ userIconDisplay: checked })
        }}
      />
    </div>
  )
}
