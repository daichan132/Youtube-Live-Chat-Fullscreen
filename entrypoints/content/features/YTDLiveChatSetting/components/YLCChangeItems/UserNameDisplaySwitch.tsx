import { useId } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useYLCUserNameDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCUserNameDisplayChange'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

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
  const id = useId()
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={userNameDisplay}
        id={id}
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ userNameDisplay: checked })
        }}
      />
    </div>
  )
}
