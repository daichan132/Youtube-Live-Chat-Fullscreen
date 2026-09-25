import type { ThemeMode } from '@/shared/theme'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'
import { normalizeChatGeometryV2, normalizeLegacyChatGeometry } from './chatGeometry'
import { DEFAULT_CHAT_GEOMETRY, DEFAULT_CHAT_PROFILE } from './defaults'
import {
  BUILTIN_PRESET_IDS,
  type BuiltinPresetId,
  type ChatAppearance,
  type ChatDisplay,
  type ChatGeometry,
  type ChatProfile,
  type ChatSettings,
  type MembershipNameColor,
  type PresetEntry,
  type RGBA,
} from './model'
import { MAX_CUSTOM_PRESETS, MAX_PRESET_ID_LENGTH, MAX_PRESET_NAME_LENGTH } from './persistConfig'

const BUILTIN_PRESET_ID_SET = new Set<string>(BUILTIN_PRESET_IDS)

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const clampFinite = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback

const booleanOr = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

export const cloneRGBA = (value: RGBA): RGBA => ({ ...value })

export const normalizeRGBA = (input: unknown, fallback: RGBA): RGBA => {
  if (!isRecord(input)) return cloneRGBA(fallback)

  return {
    r: clampFinite(input.r, 0, 255, fallback.r),
    g: clampFinite(input.g, 0, 255, fallback.g),
    b: clampFinite(input.b, 0, 255, fallback.b),
    a: clampFinite(input.a, 0, 1, fallback.a),
  }
}

export const normalizeMembershipNameColor = (
  input: unknown,
  fallback: MembershipNameColor = DEFAULT_CHAT_PROFILE.appearance.membershipNameColor,
): MembershipNameColor => {
  if (!isRecord(input)) {
    return fallback.mode === 'youtube-default' ? { mode: 'youtube-default' } : { mode: 'custom', value: cloneRGBA(fallback.value) }
  }
  if (input.mode === 'youtube-default') return { mode: 'youtube-default' }
  if (input.mode === 'custom') {
    const fallbackColor = fallback.mode === 'custom' ? fallback.value : DEFAULT_CHAT_PROFILE.appearance.fontColor
    return {
      mode: 'custom',
      value: normalizeRGBA(input.value, fallbackColor),
    }
  }
  return fallback.mode === 'youtube-default' ? { mode: 'youtube-default' } : { mode: 'custom', value: cloneRGBA(fallback.value) }
}

export const normalizeChatAppearance = (input: unknown, fallback: ChatAppearance = DEFAULT_CHAT_PROFILE.appearance): ChatAppearance => {
  const raw = isRecord(input) ? input : {}

  return {
    backgroundColor: normalizeRGBA(raw.backgroundColor, fallback.backgroundColor),
    fontColor: normalizeRGBA(raw.fontColor, fallback.fontColor),
    membershipNameColor: normalizeMembershipNameColor(raw.membershipNameColor, fallback.membershipNameColor),
    fontFamily: Object.hasOwn(raw, 'fontFamily')
      ? (() => {
          const normalized = normalizeFontFamily(raw.fontFamily)
          return normalized || null
        })()
      : fallback.fontFamily,
    fontSize: clampFinite(raw.fontSize, 10, 40, fallback.fontSize),
    blur: clampFinite(raw.blur, 0, 20, fallback.blur),
    spacing: clampFinite(raw.spacing, 0, 40, fallback.spacing),
    showUserName: booleanOr(raw.showUserName, fallback.showUserName),
    showUserIcon: booleanOr(raw.showUserIcon, fallback.showUserIcon),
    showSuperChatBar: booleanOr(raw.showSuperChatBar, fallback.showSuperChatBar),
  }
}

export const normalizeChatDisplay = (input: unknown, fallback: ChatDisplay = DEFAULT_CHAT_PROFILE.display): ChatDisplay => {
  const raw = isRecord(input) ? input : {}

  return {
    idleVisibility:
      raw.idleVisibility === 'auto-hide' || raw.idleVisibility === 'always-visible' ? raw.idleVisibility : fallback.idleVisibility,
    contentMode: raw.contentMode === 'full-chat' || raw.contentMode === 'messages-only' ? raw.contentMode : fallback.contentMode,
  }
}

export const normalizeChatProfile = (input: unknown, fallback: ChatProfile = DEFAULT_CHAT_PROFILE): ChatProfile => {
  const raw = isRecord(input) ? input : {}
  return {
    appearance: normalizeChatAppearance(raw.appearance, fallback.appearance),
    display: normalizeChatDisplay(raw.display, fallback.display),
  }
}

export const normalizeChatGeometry = (input: unknown, fallback: ChatGeometry = DEFAULT_CHAT_GEOMETRY): ChatGeometry => {
  const raw = isRecord(input) ? input : {}
  if (raw.reference === 'player' && isRecord(raw.rect)) {
    const fallbackV2 = fallback.reference === 'player' ? fallback : DEFAULT_CHAT_GEOMETRY
    return normalizeChatGeometryV2({
      reference: 'player',
      rect: {
        x: clampFinite(raw.rect.x, 0, 1, fallbackV2.rect.x),
        y: clampFinite(raw.rect.y, 0, 1, fallbackV2.rect.y),
        width: clampFinite(raw.rect.width, 0, 1, fallbackV2.rect.width),
        height: clampFinite(raw.rect.height, 0, 1, fallbackV2.rect.height),
      },
      pinned: booleanOr(raw.pinned, fallbackV2.pinned),
    })
  }

  const coordinates = isRecord(raw.coordinates) ? raw.coordinates : {}
  const size = isRecord(raw.size) ? raw.size : {}
  if (!('coordinates' in raw) && !('size' in raw)) return normalizeChatGeometry(fallback, DEFAULT_CHAT_GEOMETRY)
  const fallbackLegacy = fallback.reference === 'legacy-viewport-px' ? fallback : null
  return normalizeLegacyChatGeometry(
    {
      x: clampFinite(coordinates.x, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, fallbackLegacy?.coordinates.x ?? 20),
      y: clampFinite(coordinates.y, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, fallbackLegacy?.coordinates.y ?? 20),
    },
    {
      width: clampFinite(size.width, 0, Number.MAX_SAFE_INTEGER, fallbackLegacy?.size.width ?? 400),
      height: clampFinite(size.height, 0, Number.MAX_SAFE_INTEGER, fallbackLegacy?.size.height ?? 400),
    },
  )
}

export const isBuiltinPresetId = (value: string): value is BuiltinPresetId => BUILTIN_PRESET_ID_SET.has(value)

const normalizePresetId = (value: unknown) => {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (id.length === 0 || id.length > MAX_PRESET_ID_LENGTH) return null
  return id
}

export const normalizePresetEntry = (input: unknown): PresetEntry | null => {
  if (!isRecord(input)) return null
  const id = normalizePresetId(input.id)
  if (!id) return null

  if (input.kind === 'builtin') {
    return isBuiltinPresetId(id) ? { kind: 'builtin', id } : null
  }
  if (input.kind !== 'custom' || isBuiltinPresetId(id)) return null

  return {
    kind: 'custom',
    id,
    name: typeof input.name === 'string' ? input.name.slice(0, MAX_PRESET_NAME_LENGTH) : '',
    profile: normalizeChatProfile(input.profile),
  }
}

export const normalizePresets = (input: unknown, fallback: PresetEntry[]): PresetEntry[] => {
  const source = Array.isArray(input) ? input : fallback
  const result: PresetEntry[] = []
  const seen = new Set<string>()
  let customPresetCount = 0

  for (const rawPreset of source) {
    const preset = normalizePresetEntry(rawPreset)
    if (!preset || seen.has(preset.id)) continue
    if (preset.kind === 'custom') {
      if (customPresetCount >= MAX_CUSTOM_PRESETS) continue
      customPresetCount += 1
    }
    seen.add(preset.id)
    result.push(preset)
  }
  return result
}

export const normalizeChatSettings = (input: unknown, fallback: ChatSettings): ChatSettings => {
  const raw = isRecord(input) ? input : {}
  return {
    profile: normalizeChatProfile(raw.profile, fallback.profile),
    geometry: normalizeChatGeometry(raw.geometry, fallback.geometry),
    presets: normalizePresets(raw.presets, fallback.presets),
  }
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
