import React from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/stores'

import type { YLCStyleUpdateType } from '@/types/ytdLiveChatType'

export const AlwaysOnDisplaySwitch = () => {
  const { alwaysOnDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  return (
    <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} updateYLCStyle={updateYLCStyle} />
  )
}

export const AlwaysOnDisplaySwitchUI = ({
  alwaysOnDisplay,
  updateYLCStyle,
}: {
  alwaysOnDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
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
        checked={alwaysOnDisplay}
        id='always-on-display-switch'
        onChange={checked => {
          updateYLCStyle?.({ alwaysOnDisplay: checked })
        }}
      />
    </div>
  )
}
