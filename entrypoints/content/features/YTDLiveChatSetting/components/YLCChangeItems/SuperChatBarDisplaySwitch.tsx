import { useId } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useYLCSuperChatBarDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCSuperChatBarDisplayChange'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

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
  const id = useId()
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={superChatBarDisplay}
        id={id}
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ superChatBarDisplay: checked })
        }}
      />
    </div>
  )
}
