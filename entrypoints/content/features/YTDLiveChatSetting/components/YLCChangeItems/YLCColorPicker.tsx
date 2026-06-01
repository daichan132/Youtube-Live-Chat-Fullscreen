import { useCallback } from 'react'
import type { RgbaColor } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { RGBColor, YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { fromRgba } from './colorUtils'
import { SettingColorPicker } from './SettingColorPicker'

type ColorSettingKey = 'bgColor' | 'fontColor'

type YLCColorPickerProps = {
  settingKey: ColorSettingKey
  labelKey: string
  applyColor: (color: RGBColor) => void
}

export const YLCColorPicker = ({ settingKey, labelKey, applyColor }: YLCColorPickerProps) => {
  const { t } = useTranslation()
  const rgba = useYTDLiveChatStore(state => state[settingKey])
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)

  const onChange = useCallback(
    (color: RgbaColor) => {
      const rgb = fromRgba(color)
      applyColor(rgb)
      updateYLCStyle({ [settingKey]: rgb } as Pick<YLCStyleUpdateType, ColorSettingKey>)
    },
    [applyColor, settingKey, updateYLCStyle],
  )

  return <SettingColorPicker rgba={rgba} label={t(labelKey)} onChange={onChange} />
}
