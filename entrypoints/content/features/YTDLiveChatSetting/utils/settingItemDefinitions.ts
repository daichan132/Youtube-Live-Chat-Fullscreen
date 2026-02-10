import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import {
  TbBlur,
  TbClock,
  TbCrown,
  TbMessageCircle,
  TbPaint,
  TbPalette,
  TbSpacingHorizontal,
  TbTextSize,
  TbTypography,
  TbUser,
  TbUserCircle,
} from 'react-icons/tb'
import type { SettingItemType } from '@/shared/types/ytdLiveChatSetting'

export const BASE_SETTING_ITEM_KEYS = [
  'alwaysOnDisplay',
  'chatOnlyDisplay',
  'backgroundColor',
  'fontColor',
  'fontFamily',
  'fontSize',
  'blur',
  'space',
  'userNameDisplay',
  'userIconDisplay',
] as const

export const SETTING_ITEM_KEYS = [...BASE_SETTING_ITEM_KEYS, 'superChatBarDisplay'] as const

export const PRESET_ITEM_KEYS = [...BASE_SETTING_ITEM_KEYS] as const

export type SettingItemKey =
  | (typeof BASE_SETTING_ITEM_KEYS)[number]
  | (typeof SETTING_ITEM_KEYS)[number]
  | (typeof PRESET_ITEM_KEYS)[number]

type SettingItemDefinition = { icon: IconType; titleKey: string; actionWidth?: SettingItemType['actionWidth'] }

const settingItemDefinitions: Record<SettingItemKey, SettingItemDefinition> = {
  alwaysOnDisplay: { icon: TbClock, titleKey: 'content.setting.alwaysOnDisplay' },
  chatOnlyDisplay: { icon: TbMessageCircle, titleKey: 'content.setting.chatOnlyDisplay' },
  backgroundColor: { icon: TbPaint, titleKey: 'content.setting.backgroundColor' },
  fontColor: { icon: TbPalette, titleKey: 'content.setting.fontColor' },
  fontFamily: { icon: TbTypography, titleKey: 'content.setting.fontFamily' },
  fontSize: { icon: TbTextSize, titleKey: 'content.setting.fontSize' },
  blur: { icon: TbBlur, titleKey: 'content.setting.blur' },
  space: { icon: TbSpacingHorizontal, titleKey: 'content.setting.space' },
  userNameDisplay: { icon: TbUser, titleKey: 'content.setting.userNameDisplay' },
  userIconDisplay: { icon: TbUserCircle, titleKey: 'content.setting.userIconDisplay' },
  superChatBarDisplay: { icon: TbCrown, titleKey: 'content.setting.superChatBarDisplay' },
}

export const buildSettingItems = <Key extends SettingItemKey>({
  t,
  keys,
  dataByKey,
  disableByKey,
}: {
  t: TFunction
  keys: readonly Key[]
  dataByKey: Record<Key, ReactNode>
  disableByKey?: Partial<Record<Key, boolean>>
}): SettingItemType[] => {
  return keys.map(key => {
    const { icon, titleKey, actionWidth } = settingItemDefinitions[key]
    return {
      icon,
      title: t(titleKey),
      data: dataByKey[key],
      disable: disableByKey?.[key],
      actionWidth,
    }
  })
}
