import { useTranslation } from 'react-i18next'

import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const ChatOnlyDisplaySwitch = () => {
  const chatOnlyDisplay = useYTDLiveChatStore(state => state.chatOnlyDisplay)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  return <ChatOnlyDisplaySwitchUI chatOnlyDisplay={chatOnlyDisplay} updateYLCStyle={updateYLCStyle} />
}

export const ChatOnlyDisplaySwitchUI = ({
  chatOnlyDisplay,
  updateYLCStyle,
}: {
  chatOnlyDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
}) => {
  const { t } = useTranslation()
  return (
    <SettingSwitch
      checked={chatOnlyDisplay}
      aria-label={t('content.setting.chatOnlyDisplay')}
      onChange={checked => {
        updateYLCStyle?.({ chatOnlyDisplay: checked })
      }}
    />
  )
}
