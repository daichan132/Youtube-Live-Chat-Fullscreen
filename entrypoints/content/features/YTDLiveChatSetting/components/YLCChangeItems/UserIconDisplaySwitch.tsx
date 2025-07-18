import { useId } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useYLCUserIconDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCUserIconDisplayChange'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

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
  const id = useId()
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={userIconDisplay}
        id={id}
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ userIconDisplay: checked })
        }}
      />
    </div>
  )
}
