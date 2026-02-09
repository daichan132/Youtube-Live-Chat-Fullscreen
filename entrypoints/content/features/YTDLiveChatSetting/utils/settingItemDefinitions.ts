import type { TFunction } from 'i18next'
import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { FaRegUserCircle } from 'react-icons/fa'
import { IoChatbubbleEllipsesOutline, IoColorFillOutline, IoTimerOutline } from 'react-icons/io5'
import { MdBlurOn, MdExpand } from 'react-icons/md'
import { RiFontColor, RiFontFamily, RiFontSize2, RiUserLine } from 'react-icons/ri'
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

const settingItemDefinitions: Record<SettingItemKey, { icon: IconType; titleKey: string }> = {
  alwaysOnDisplay: { icon: IoTimerOutline, titleKey: 'content.setting.alwaysOnDisplay' },
  chatOnlyDisplay: { icon: IoChatbubbleEllipsesOutline, titleKey: 'content.setting.chatOnlyDisplay' },
  backgroundColor: { icon: IoColorFillOutline, titleKey: 'content.setting.backgroundColor' },
  fontColor: { icon: RiFontColor, titleKey: 'content.setting.fontColor' },
  fontFamily: { icon: RiFontFamily, titleKey: 'content.setting.fontFamily' },
  fontSize: { icon: RiFontSize2, titleKey: 'content.setting.fontSize' },
  blur: { icon: MdBlurOn, titleKey: 'content.setting.blur' },
  space: { icon: MdExpand, titleKey: 'content.setting.space' },
  userNameDisplay: { icon: RiUserLine, titleKey: 'content.setting.userNameDisplay' },
  userIconDisplay: { icon: FaRegUserCircle, titleKey: 'content.setting.userIconDisplay' },
  superChatBarDisplay: { icon: IoChatbubbleEllipsesOutline, titleKey: 'content.setting.superChatBarDisplay' },
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
    const { icon, titleKey } = settingItemDefinitions[key]
    return {
      icon,
      title: t(titleKey),
      data: dataByKey[key],
      disable: disableByKey?.[key],
    }
  })
}
