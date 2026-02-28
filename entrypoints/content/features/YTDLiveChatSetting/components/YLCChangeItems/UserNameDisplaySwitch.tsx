import { useTranslation } from 'react-i18next'

import { useYLCDisplayChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCDisplayChange'
import { useYTDLiveChatStore } from '@/shared/stores'

import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { SettingSwitch } from './SettingSwitch'

export const UserNameDisplaySwitch = () => {
  const userNameDisplay = useYTDLiveChatStore(state => state.userNameDisplay)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const { changeDisplay } = useYLCDisplayChange('--extension-user-name-display')
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
  const { t } = useTranslation()
  return (
    <SettingSwitch
      checked={userNameDisplay}
      aria-label={t('content.setting.userNameDisplay')}
      onChange={checked => {
        changeDisplay?.(checked)
        updateYLCStyle?.({ userNameDisplay: checked })
      }}
    />
  )
}
