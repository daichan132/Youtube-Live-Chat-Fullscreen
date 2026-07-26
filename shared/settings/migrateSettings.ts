import { BUILTIN_PRESETS } from './builtinPresets'
import { DEFAULT_CHAT_GEOMETRY, DEFAULT_CHAT_PROFILE, LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from './defaults'
import { BUILTIN_PRESET_IDS, type BuiltinPresetId, type ChatProfile, type ChatSettings, type PresetEntry, type RGBA } from './model'
import { isRecord, normalizeChatGeometry, normalizeChatProfile, normalizeChatSettings, normalizeRGBA } from './normalizeSettings'

export type PersistedSettingsV6 = {
  bgColor?: unknown
  fontColor?: unknown
  membershipNameColor?: unknown
  fontFamily?: unknown
  fontSize?: unknown
  blur?: unknown
  space?: unknown
  alwaysOnDisplay?: unknown
  chatOnlyDisplay?: unknown
  userNameDisplay?: unknown
  userIconDisplay?: unknown
  superChatBarDisplay?: unknown
  coordinates?: unknown
  size?: unknown
  presetItemIds?: unknown
  presetItemStyles?: unknown
  presetItemTitles?: unknown
  addPresetEnabled?: unknown
  reactionButtonDisplay?: unknown
}

const LEGACY_BUILTIN_IDS: Record<string, BuiltinPresetId> = {
  default1: 'standard',
  default2: 'transparent',
  default3: 'simple',
  default4: 'dark',
  default5: 'readable',
  default6: 'compact',
  default7: 'neon',
}

const isSameRGBA = (left: RGBA, right: RGBA) => left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a

export const isLegacyDefaultMembershipColor = (input: unknown) =>
  isSameRGBA(normalizeRGBA(input, LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR), LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR)

const booleanOr = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
const numberOr = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

export const migrateLegacyStyleToProfile = (input: unknown, fallback: ChatProfile = DEFAULT_CHAT_PROFILE): ChatProfile => {
  const raw = isRecord(input) ? input : {}
  const legacyMembershipColor = normalizeRGBA(raw.membershipNameColor, LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR)

  return normalizeChatProfile(
    {
      appearance: {
        backgroundColor: raw.bgColor,
        fontColor: raw.fontColor,
        membershipNameColor: isSameRGBA(legacyMembershipColor, LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR)
          ? { mode: 'youtube-default' }
          : { mode: 'custom', value: legacyMembershipColor },
        fontFamily: typeof raw.fontFamily === 'string' && raw.fontFamily.length > 0 ? raw.fontFamily : null,
        fontSize: numberOr(raw.fontSize, fallback.appearance.fontSize),
        blur: numberOr(raw.blur, fallback.appearance.blur),
        spacing: numberOr(raw.space, fallback.appearance.spacing),
        showUserName: booleanOr(raw.userNameDisplay, fallback.appearance.showUserName),
        showUserIcon: booleanOr(raw.userIconDisplay, fallback.appearance.showUserIcon),
        showSuperChatBar: booleanOr(raw.superChatBarDisplay, fallback.appearance.showSuperChatBar),
      },
      display: {
        idleVisibility: booleanOr(raw.alwaysOnDisplay, fallback.display.idleVisibility === 'always-visible')
          ? 'always-visible'
          : 'auto-hide',
        contentMode: booleanOr(raw.chatOnlyDisplay, fallback.display.contentMode === 'messages-only') ? 'messages-only' : 'full-chat',
      },
    },
    fallback,
  )
}

const nextAvailableCustomId = (requestedId: string, usedIds: Set<string>) => {
  const base = BUILTIN_PRESET_IDS.includes(requestedId as BuiltinPresetId) ? `custom-${requestedId}` : requestedId
  let id = base
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return id
}

export const migrateLegacyPresets = (input: PersistedSettingsV6): PresetEntry[] => {
  const rawIds = Array.isArray(input.presetItemIds) ? input.presetItemIds : null
  const rawStyles = isRecord(input.presetItemStyles) ? input.presetItemStyles : {}
  const rawTitles = isRecord(input.presetItemTitles) ? input.presetItemTitles : {}
  const sourceIds = rawIds ?? Object.keys(LEGACY_BUILTIN_IDS)
  const shouldAddLaterBuiltins =
    rawIds === null || rawIds.some(id => typeof id === 'string' && (id === 'default1' || id === 'default2' || id === 'default3'))
  const effectiveIds = shouldAddLaterBuiltins
    ? [...sourceIds, ...['default4', 'default5', 'default6', 'default7'].filter(id => !sourceIds.includes(id))]
    : sourceIds
  const presets: PresetEntry[] = []
  const usedIds = new Set<string>()

  for (const rawId of effectiveIds) {
    if (typeof rawId !== 'string' || rawId.trim().length === 0 || rawId.length > 128) continue
    const builtinId = LEGACY_BUILTIN_IDS[rawId]
    if (builtinId) {
      if (usedIds.has(builtinId)) continue
      usedIds.add(builtinId)
      presets.push({ kind: 'builtin', id: builtinId })
      continue
    }

    const rawStyle = rawStyles[rawId]
    if (!isRecord(rawStyle)) continue
    const id = nextAvailableCustomId(rawId, usedIds)
    usedIds.add(id)
    presets.push({
      kind: 'custom',
      id,
      name: typeof rawTitles[rawId] === 'string' ? rawTitles[rawId].slice(0, 100) : '',
      profile: migrateLegacyStyleToProfile(rawStyle),
    })
  }

  return presets
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  profile: DEFAULT_CHAT_PROFILE,
  geometry: DEFAULT_CHAT_GEOMETRY,
  presets: BUILTIN_PRESET_IDS.map(id => ({ kind: 'builtin', id })),
}

export const migrateV6ToV7 = (old: PersistedSettingsV6): ChatSettings => ({
  profile: migrateLegacyStyleToProfile(old),
  geometry: normalizeChatGeometry(
    {
      coordinates: old.coordinates,
      size: old.size,
    },
    DEFAULT_CHAT_GEOMETRY,
  ),
  presets: migrateLegacyPresets(old),
})

const isV7Settings = (input: unknown) => isRecord(input) && ('profile' in input || 'geometry' in input || 'presets' in input)

export const migrateSettings = (input: unknown): ChatSettings => {
  if (isV7Settings(input)) return normalizeChatSettings(input, DEFAULT_CHAT_SETTINGS)
  return migrateV6ToV7(isRecord(input) ? input : {})
}

export const resolvePresetProfile = (preset: PresetEntry): ChatProfile =>
  preset.kind === 'builtin' ? normalizeChatProfile(BUILTIN_PRESETS[preset.id].profile) : normalizeChatProfile(preset.profile)
