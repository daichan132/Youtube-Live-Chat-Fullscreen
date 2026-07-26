import { useCallback } from 'react'
import type { RgbaColor } from 'react-colorful'
import { useTranslation } from 'react-i18next'
import { useEffectiveChatProfile } from '@/entrypoints/content/settings/ChatEditorStore'
import { LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from '@/shared/settings/defaults'
import { beginYLCStyleGesture, finishYLCStyleGesture, previewYLCStyleUpdate } from '../../styleHistoryCommands'
import { fromRgba } from './colorUtils'
import { SettingColorPicker } from './SettingColorPicker'

type ColorSettingKey = 'backgroundColor' | 'fontColor' | 'membershipNameColor'

type YLCColorPickerProps = {
  settingKey: ColorSettingKey
  labelKey: string
}

export const YLCColorPicker = ({ settingKey, labelKey }: YLCColorPickerProps) => {
  const { t } = useTranslation()
  const appearance = useEffectiveChatProfile().appearance
  const rgba =
    settingKey === 'membershipNameColor'
      ? appearance.membershipNameColor.mode === 'custom'
        ? appearance.membershipNameColor.value
        : LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR
      : appearance[settingKey]
  const gestureId = `color:${settingKey}`

  const onChange = useCallback(
    (color: RgbaColor) => {
      const rgb = fromRgba(color)
      previewYLCStyleUpdate(
        gestureId,
        {
          appearance: {
            [settingKey]: settingKey === 'membershipNameColor' ? { mode: 'custom', value: rgb } : rgb,
          },
        },
        settingKey,
      )
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
