import { useAtomValue } from 'jotai'
import { useCallback } from 'react'
import type { RgbaColor } from 'react-colorful'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import { LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from '@/shared/settings/defaults'
import { effectiveProfileAtom } from '@/shared/state'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'
import { fromRgba } from './colorUtils'
import { SettingColorPicker } from './SettingColorPicker'

type ColorSettingKey = 'backgroundColor' | 'fontColor' | 'membershipNameColor'

type YLCColorPickerProps = {
  settingKey: ColorSettingKey
  labelKey: TranslationKey
}

export const YLCColorPicker = ({ settingKey, labelKey }: YLCColorPickerProps) => {
  const t = useT()
  const appearance = useAtomValue(effectiveProfileAtom).appearance
  const { beginYLCStyleGesture, finishYLCStyleGesture, previewYLCStyleUpdate } = useStyleHistoryCommands()
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
