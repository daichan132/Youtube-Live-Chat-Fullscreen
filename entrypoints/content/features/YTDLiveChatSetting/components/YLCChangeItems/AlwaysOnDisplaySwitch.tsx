import { useId } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

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
  const id = useId()
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={alwaysOnDisplay}
        id={id}
        onChange={checked => {
          updateYLCStyle?.({ alwaysOnDisplay: checked })
        }}
      />
    </div>
  )
}
