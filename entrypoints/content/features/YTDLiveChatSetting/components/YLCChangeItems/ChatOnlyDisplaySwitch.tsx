import { useId } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

export const ChatOnlyDisplaySwitch = () => {
  const { chatOnlyDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  return <ChatOnlyDisplaySwitchUI chatOnlyDisplay={chatOnlyDisplay} updateYLCStyle={updateYLCStyle} />
}

export const ChatOnlyDisplaySwitchUI = ({
  chatOnlyDisplay,
  updateYLCStyle,
}: {
  chatOnlyDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
}) => {
  const id = useId()
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={chatOnlyDisplay}
        id={id}
        onChange={checked => {
          updateYLCStyle?.({ chatOnlyDisplay: checked })
        }}
      />
    </div>
  )
}
