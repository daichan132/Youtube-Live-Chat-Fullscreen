import { DefaultCoordinates, DefaultSize, ResizableMinHeight, ResizableMinWidth } from '@/shared/constants'
import type { ThemeMode } from '@/shared/theme'
import type { RGBColor, YLCStyleType } from '@/shared/types/ytdLiveChatType'
import { ylcInitSetting } from '@/shared/utils'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'
import { SETTINGS_EXPORT_VERSION } from './persistConfig'

const STYLE_KEYS = [
  'bgColor',
  'fontColor',
  'membershipNameColor',
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

const MAX_PRESET_ID_LENGTH = 128
const MAX_PRESET_TITLE_LENGTH = 100

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

const clampFinite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback

const booleanOr = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

export const normalizeColor = (input: unknown, fallback: RGBColor): RGBColor => {
  if (!isRecord(input)) return { ...fallback }

  return {
    r: clampFinite(input.r, 0, 255, fallback.r),
    g: clampFinite(input.g, 0, 255, fallback.g),
    b: clampFinite(input.b, 0, 255, fallback.b),
    a: clampFinite(input.a, 0, 1, 1),
  }
}

export const normalizeStyle = (input: unknown, base: YLCStyleType = ylcInitSetting): YLCStyleType => {
  const raw = isRecord(input) ? input : {}

  return {
    bgColor: normalizeColor(raw.bgColor, base.bgColor),
    fontColor: normalizeColor(raw.fontColor, base.fontColor),
    membershipNameColor: normalizeColor(raw.membershipNameColor, base.membershipNameColor),
    fontFamily: Object.hasOwn(raw, 'fontFamily') ? normalizeFontFamily(raw.fontFamily) : base.fontFamily,
    fontSize: clampFinite(raw.fontSize, 10, 40, base.fontSize),
    blur: clampFinite(raw.blur, 0, 20, base.blur),
    space: clampFinite(raw.space, 0, 40, base.space),
    alwaysOnDisplay: booleanOr(raw.alwaysOnDisplay, base.alwaysOnDisplay),
    chatOnlyDisplay: booleanOr(raw.chatOnlyDisplay, base.chatOnlyDisplay),
    userNameDisplay: booleanOr(raw.userNameDisplay, base.userNameDisplay),
    userIconDisplay: booleanOr(raw.userIconDisplay, base.userIconDisplay),
    superChatBarDisplay: booleanOr(raw.superChatBarDisplay, base.superChatBarDisplay),
  }
}

export const normalizeStoredGeometry = (
  input: unknown,
  fallback: {
    coordinates: { x: number; y: number }
    size: { width: number; height: number }
  } = {
    coordinates: DefaultCoordinates,
    size: DefaultSize,
  },
) => {
  const raw = isRecord(input) ? input : {}
  const coordinates = isRecord(raw.coordinates) ? raw.coordinates : {}
  const size = isRecord(raw.size) ? raw.size : {}

  return {
    coordinates: {
      x: clampFinite(coordinates.x, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, fallback.coordinates.x),
      y: clampFinite(coordinates.y, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, fallback.coordinates.y),
    },
    size: {
      width: clampFinite(size.width, ResizableMinWidth, Number.MAX_SAFE_INTEGER, fallback.size.width),
      height: clampFinite(size.height, ResizableMinHeight, Number.MAX_SAFE_INTEGER, fallback.size.height),
    },
  }
}

export const normalizePresetCollections = (input: unknown) => {
  const raw = isRecord(input) ? input : {}
  const rawIds = Array.isArray(raw.presetItemIds) ? raw.presetItemIds : []
  const rawStyles = isRecord(raw.presetItemStyles) ? raw.presetItemStyles : {}
  const rawTitles = isRecord(raw.presetItemTitles) ? raw.presetItemTitles : {}
  const presetItemIds: string[] = []
  const presetItemStyles: Record<string, YLCStyleType> = {}
  const presetItemTitles: Record<string, string> = {}
  const seen = new Set<string>()

  for (const value of rawIds) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_PRESET_ID_LENGTH || seen.has(value)) continue
    if (!isRecord(rawStyles[value])) continue

    seen.add(value)
    presetItemIds.push(value)
    presetItemStyles[value] = normalizeStyle(rawStyles[value])
    const title = rawTitles[value]
    presetItemTitles[value] = typeof title === 'string' ? title.slice(0, MAX_PRESET_TITLE_LENGTH) : ''
  }

  return { presetItemIds, presetItemStyles, presetItemTitles }
}

export const normalizeGlobalSetting = (input: unknown) => {
  if (!isRecord(input)) return {}

  const result: { ytdLiveChat?: boolean; themeMode?: ThemeMode } = {}
  if (typeof input.ytdLiveChat === 'boolean') result.ytdLiveChat = input.ytdLiveChat
  if (input.themeMode === 'light' || input.themeMode === 'dark' || input.themeMode === 'system') {
    result.themeMode = input.themeMode
  }
  return result
}

export const normalizePersistedYTDLiveChatState = (input: unknown): Record<string, unknown> => {
  if (!isRecord(input)) return {}

  const result: Record<string, unknown> = {}
  if (STYLE_KEYS.some(key => Object.hasOwn(input, key))) {
    Object.assign(result, normalizeStyle(input))
  }
  if (Object.hasOwn(input, 'coordinates') || Object.hasOwn(input, 'size')) {
    Object.assign(result, normalizeStoredGeometry(input))
  }
  if (typeof input.addPresetEnabled === 'boolean') result.addPresetEnabled = input.addPresetEnabled
  if (Object.hasOwn(input, 'presetItemIds') || Object.hasOwn(input, 'presetItemStyles') || Object.hasOwn(input, 'presetItemTitles')) {
    Object.assign(result, normalizePresetCollections(input))
  }
  return result
}

export type NormalizedSettingsBackup = {
  version: typeof SETTINGS_EXPORT_VERSION
  exportedAt?: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

export const normalizeSettingsBackup = (
  input: unknown,
  current: {
    globalSetting: Record<string, unknown>
    ytdLiveChat: Record<string, unknown>
  },
): NormalizedSettingsBackup | null => {
  if (!isRecord(input) || input.version !== SETTINGS_EXPORT_VERSION) return null
  if (!isRecord(input.globalSetting) || !isRecord(input.ytdLiveChat)) return null

  const mergedGlobal = { ...current.globalSetting, ...input.globalSetting }
  const mergedYtd = { ...current.ytdLiveChat, ...input.ytdLiveChat }

  return {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : undefined,
    globalSetting: {
      ...current.globalSetting,
      ...normalizeGlobalSetting(mergedGlobal),
    },
    ytdLiveChat: normalizePersistedYTDLiveChatState(mergedYtd),
  }
}
