import { useCallback } from 'react'
import type { RgbaColor } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { beginYLCStyleGesture, finishYLCStyleGesture, previewYLCStyleUpdate } from '../../styleHistoryCommands'
import { fromRgba } from './colorUtils'
import { SettingColorPicker } from './SettingColorPicker'

type ColorSettingKey = 'bgColor' | 'fontColor' | 'membershipNameColor'

type YLCColorPickerProps = {
  settingKey: ColorSettingKey
  labelKey: string
}

export const YLCColorPicker = ({ settingKey, labelKey }: YLCColorPickerProps) => {
  const { t } = useTranslation()
  const rgba = useYTDLiveChatStore(state => state[settingKey])
  const gestureId = `color:${settingKey}`

  const onChange = useCallback(
    (color: RgbaColor) => {
      const rgb = fromRgba(color)
      previewYLCStyleUpdate(gestureId, { [settingKey]: rgb } as Pick<YLCStyleUpdateType, ColorSettingKey>, settingKey)
    },
    [gestureId, settingKey],
  )
  const onInteractionStart = useCallback(() => beginYLCStyleGesture(gestureId, settingKey), [gestureId, settingKey])
  const onInteractionEnd = useCallback(() => finishYLCStyleGesture(gestureId), [gestureId])

  return (
    <SettingColorPicker
      rgba={rgba}
      label={t(labelKey)}
      onChange={onChange}
      onInteractionStart={onInteractionStart}
      onInteractionEnd={onInteractionEnd}
    />
  )
}
