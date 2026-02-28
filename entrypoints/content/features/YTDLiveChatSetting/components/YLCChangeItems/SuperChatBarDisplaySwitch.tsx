import { useTranslation } from 'react-i18next'

import { useYLCDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const SuperChatBarDisplaySwitch = () => {
  const superChatBarDisplay = useYTDLiveChatStore(state => state.superChatBarDisplay)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const { changeDisplay } = useYLCDisplayChange('--extension-super-chat-bar-display', 'block')
  return (
    <SuperChatBarDisplaySwitchUI superChatBarDisplay={superChatBarDisplay} updateYLCStyle={updateYLCStyle} changeDisplay={changeDisplay} />
  )
}

const SuperChatBarDisplaySwitchUI = ({
  superChatBarDisplay,
  updateYLCStyle,
  changeDisplay,
}: {
  superChatBarDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
  changeDisplay?: (superChatBarDisplay: boolean) => void
}) => {
  const { t } = useTranslation()
  return (
    <SettingSwitch
      checked={superChatBarDisplay}
      aria-label={t('content.setting.superChatBarDisplay')}
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ superChatBarDisplay: checked })
      }}
    />
  )
}
