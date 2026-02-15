import { useGlobalSettingStore } from '@/shared/stores/globalSettingStore'
import { useYTDLiveChatStore } from '@/shared/stores/ytdLiveChatStore'
import type { YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'

// Keep in sync with each store's persist config (name / version).
const GLOBAL_SETTING_PERSIST = { key: 'globalSettingStore', version: 1 } as const
const YTD_LIVE_CHAT_PERSIST = { key: 'ytdLiveChatStore', version: 2 } as const

const YTD_LIVE_CHAT_DATA_KEYS = [
  'presetItemIds',
  'presetItemStyles',
  'presetItemTitles',
  'addPresetEnabled',
  'coordinates',
  'size',
  'bgColor',
  'fontColor',
  'fontFamily',
  'fontSize',
  'blur',
  'space',
  'alwaysOnDisplay',
  'chatOnlyDisplay',
  'userNameDisplay',
  'userIconDisplay',
  'superChatBarDisplay',
] as const

// ── Extract ──────────────────────────────────────────────

const extractGlobalSettingData = () => {
  const { ytdLiveChat, themeMode } = useGlobalSettingStore.getState()
  return { ytdLiveChat, themeMode }
}

const extractYTDLiveChatData = () => {
  const state = useYTDLiveChatStore.getState()
  return Object.fromEntries(YTD_LIVE_CHAT_DATA_KEYS.map(key => [key, state[key]]))
}

// ── Validate ─────────────────────────────────────────────

export type ExportData = {
  version: number
  exportedAt: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

export const isValidImportData = (data: unknown): data is ExportData => {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    !!obj.globalSetting &&
    typeof obj.globalSetting === 'object' &&
    !!obj.ytdLiveChat &&
    typeof obj.ytdLiveChat === 'object'
  )
}

// ── Sanitize ─────────────────────────────────────────────

export const isRGBColor = (v: unknown): boolean => !!v && typeof v === 'object' && typeof (v as Record<string, unknown>).r === 'number'

const pick = <T extends Record<string, unknown>>(source: T, keys: readonly string[]): Partial<T> => {
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    if (Object.hasOwn(source, key)) {
      result[key] = source[key]
    }
  }
  return result as Partial<T>
}

export const sanitizeYLCStyle = (style: Record<string, unknown>): Partial<YLCStyleType> => {
  const result: Record<string, unknown> = {}
  if (isRGBColor(style.bgColor)) result.bgColor = style.bgColor
  if (isRGBColor(style.fontColor)) result.fontColor = style.fontColor
  if (typeof style.fontFamily === 'string') result.fontFamily = normalizeFontFamily(style.fontFamily)
  if (typeof style.fontSize === 'number') result.fontSize = style.fontSize
  if (typeof style.blur === 'number') result.blur = style.blur
  if (typeof style.space === 'number') result.space = style.space
  if (typeof style.alwaysOnDisplay === 'boolean') result.alwaysOnDisplay = style.alwaysOnDisplay
  if (typeof style.chatOnlyDisplay === 'boolean') result.chatOnlyDisplay = style.chatOnlyDisplay
  if (typeof style.userNameDisplay === 'boolean') result.userNameDisplay = style.userNameDisplay
  if (typeof style.userIconDisplay === 'boolean') result.userIconDisplay = style.userIconDisplay
  if (typeof style.superChatBarDisplay === 'boolean') result.superChatBarDisplay = style.superChatBarDisplay
  return result as Partial<YLCStyleType>
}

export const sanitizeGlobalSetting = (raw: Record<string, unknown>) => {
  const result: Record<string, unknown> = {}
  if (typeof raw.ytdLiveChat === 'boolean') result.ytdLiveChat = raw.ytdLiveChat
  if (raw.themeMode === 'light' || raw.themeMode === 'dark' || raw.themeMode === 'system') {
    result.themeMode = raw.themeMode
  }
  return result
}

export const sanitizeYTDLiveChat = (raw: Record<string, unknown>) => {
  const result: Record<string, unknown> = { ...sanitizeYLCStyle(raw) }

  if (Array.isArray(raw.presetItemIds) && raw.presetItemIds.every((id: unknown) => typeof id === 'string')) {
    result.presetItemIds = raw.presetItemIds
  }
  if (typeof raw.addPresetEnabled === 'boolean') result.addPresetEnabled = raw.addPresetEnabled
  if (
    raw.coordinates &&
    typeof raw.coordinates === 'object' &&
    typeof (raw.coordinates as Record<string, unknown>).x === 'number' &&
    typeof (raw.coordinates as Record<string, unknown>).y === 'number'
  ) {
    result.coordinates = pick(raw.coordinates as Record<string, unknown>, ['x', 'y'])
  }
  if (
    raw.size &&
    typeof raw.size === 'object' &&
    typeof (raw.size as Record<string, unknown>).width === 'number' &&
    typeof (raw.size as Record<string, unknown>).height === 'number'
  ) {
    result.size = pick(raw.size as Record<string, unknown>, ['width', 'height'])
  }
  if (raw.presetItemStyles && typeof raw.presetItemStyles === 'object') {
    const sanitized: Record<string, Partial<YLCStyleType>> = {}
    for (const [id, s] of Object.entries(raw.presetItemStyles as Record<string, unknown>)) {
      if (s && typeof s === 'object') {
        sanitized[id] = sanitizeYLCStyle(s as Record<string, unknown>)
      }
    }
    result.presetItemStyles = sanitized
  }
  if (raw.presetItemTitles && typeof raw.presetItemTitles === 'object') {
    const sanitized: Record<string, string> = {}
    for (const [id, title] of Object.entries(raw.presetItemTitles as Record<string, unknown>)) {
      if (typeof title === 'string') {
        sanitized[id] = title
      }
    }
    result.presetItemTitles = sanitized
  }
  return result
}

// ── Export / Import ──────────────────────────────────────

export const buildExportData = (): ExportData => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  globalSetting: extractGlobalSettingData(),
  ytdLiveChat: extractYTDLiveChatData(),
})

export const persistImportedSettings = async (importData: ExportData) => {
  const globalSettingUpdate = sanitizeGlobalSetting(importData.globalSetting)
  const ytdLiveChatUpdate = sanitizeYTDLiveChat(importData.ytdLiveChat)

  const mergedGlobalState = { ...extractGlobalSettingData(), ...globalSettingUpdate }
  const mergedYtdState = { ...extractYTDLiveChatData(), ...ytdLiveChatUpdate }

  // Write directly to chrome.storage.local and await completion.
  // Zustand persist writes asynchronously via fire-and-forget,
  // so window.close() would cancel the pending writes.
  await chrome.storage.local.set({
    [GLOBAL_SETTING_PERSIST.key]: JSON.stringify({ state: mergedGlobalState, version: GLOBAL_SETTING_PERSIST.version }),
    [YTD_LIVE_CHAT_PERSIST.key]: JSON.stringify({ state: mergedYtdState, version: YTD_LIVE_CHAT_PERSIST.version }),
  })

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { message: 'settingsImported' }, () => {
        void chrome.runtime.lastError
      })
    }
  })
}
