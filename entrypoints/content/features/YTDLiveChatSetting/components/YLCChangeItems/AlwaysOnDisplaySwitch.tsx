import { useTranslation } from 'react-i18next'

import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const AlwaysOnDisplaySwitch = () => {
  const alwaysOnDisplay = useYTDLiveChatStore(state => state.alwaysOnDisplay)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  return <AlwaysOnDisplaySwitchUI alwaysOnDisplay={alwaysOnDisplay} updateYLCStyle={updateYLCStyle} />
}

export const AlwaysOnDisplaySwitchUI = ({
  alwaysOnDisplay,
  updateYLCStyle,
}: {
  alwaysOnDisplay: boolean
  updateYLCStyle?: (ylcStyle: YLCStyleUpdateType) => void
}) => {
  const { t } = useTranslation()
  return (
    <SettingSwitch
      checked={alwaysOnDisplay}
      aria-label={t('content.setting.alwaysOnDisplay')}
      onChange={checked => {
        updateYLCStyle?.({ alwaysOnDisplay: checked })
      }}
    />
  )
}
