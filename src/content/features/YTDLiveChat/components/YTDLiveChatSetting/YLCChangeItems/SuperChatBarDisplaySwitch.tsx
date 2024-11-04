import React from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/stores'
import { useYLCSuperChatBarDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCSuperChatBarDisplayChange'

import type { YLCStyleUpdateType } from '../../../../../../types/ytdLiveChatType'

export const SuperChatBarDisplaySwitch = () => {
  const { superChatBarDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      superChatBarDisplay: state.superChatBarDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCSuperChatBarDisplayChange()
  return (
    <SuperChatBarDisplaySwitchUI
      superChatBarDisplay={superChatBarDisplay}
      updateYLCStyle={updateYLCStyle}
      changeDisplay={changeDisplay}
    />
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
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={superChatBarDisplay}
        id='super-chat-bar-display-switch'
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ superChatBarDisplay: checked })
        }}
      />
    </div>
  )
}
