import { useShallow } from 'zustand/react/shallow'

import { useYLCReactionButtonDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCReactionButtonDisplayChange'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'

export const ReactionButtonDisplaySwitch = () => {
  const { reactionButtonDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      reactionButtonDisplay: state.reactionButtonDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )
  const { changeDisplay } = useYLCReactionButtonDisplayChange()
  return (
    <ReactionButtonDisplaySwitchUI
      reactionButtonDisplay={reactionButtonDisplay}
      updateYLCStyle={updateYLCStyle}
      changeDisplay={changeDisplay}
    />
  )
}

export const ReactionButtonDisplaySwitchUI = ({
  reactionButtonDisplay,
  updateYLCStyle,
  changeDisplay,
}: {
  reactionButtonDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
  changeDisplay?: (reactionButtonDisplay: boolean) => void
}) => {
  return (
    <div className='w-[150px] flex justify-center'>
      <Switch
        checked={reactionButtonDisplay}
        id='reaction-button-display-switch'
        onChange={checked => {
          changeDisplay?.(checked)
          updateYLCStyle?.({ reactionButtonDisplay: checked })
        }}
      />
    </div>
  )
}
