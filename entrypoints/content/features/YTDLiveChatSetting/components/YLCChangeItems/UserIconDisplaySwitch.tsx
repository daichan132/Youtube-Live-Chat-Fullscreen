import { useTranslation } from 'react-i18next'

import { useYLCDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const UserIconDisplaySwitch = () => {
  const userIconDisplay = useYTDLiveChatStore(state => state.userIconDisplay)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const { changeDisplay } = useYLCDisplayChange('--extension-user-icon-display')
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
  const { t } = useTranslation()
  return (
    <SettingSwitch
      checked={userIconDisplay}
      aria-label={t('content.setting.userIconDisplay')}
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ userIconDisplay: checked })
      }}
    />
  )
}
