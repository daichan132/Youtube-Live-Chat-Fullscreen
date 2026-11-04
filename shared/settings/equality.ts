import type {
  ChatAppearance,
  ChatDisplay,
  ChatGeometry,
  ChatGeometryV2,
  ChatProfile,
  ChatSettings,
  GlobalSettings,
  LegacyChatGeometry,
  MembershipNameColor,
  PresetEntry,
  RGBA,
} from './model'

// A comparator is required for every field, so adding a setting cannot silently
// bypass persistence and history change detection.
const compareFields = <T extends object>(comparators: { [K in keyof T]-?: (left: T[K], right: T[K]) => boolean }) => {
  const keys = Object.keys(comparators) as (keyof T)[]
  return (left: T, right: T) => keys.every(key => comparators[key](left[key], right[key]))
}

const equalValue = <T>(left: T, right: T) => left === right

export const areRGBAEqual = compareFields<RGBA>({ r: equalValue, g: equalValue, b: equalValue, a: equalValue })

export const areMembershipColorsEqual = (left: MembershipNameColor, right: MembershipNameColor) =>
  left.mode === right.mode && (left.mode === 'youtube-default' || (right.mode === 'custom' && areRGBAEqual(left.value, right.value)))

export const areGlobalSettingsEqual = (left: GlobalSettings, right: GlobalSettings) =>
  left.ytdLiveChat === right.ytdLiveChat && left.themeMode === right.themeMode

const areAppearancesEqual = compareFields<ChatAppearance>({
  backgroundColor: areRGBAEqual,
  fontColor: areRGBAEqual,
  membershipNameColor: areMembershipColorsEqual,
  fontFamily: equalValue,
  fontSize: equalValue,
  blur: equalValue,
  spacing: equalValue,
  showUserName: equalValue,
  showUserIcon: equalValue,
  showSuperChatBar: equalValue,
})

const areDisplaysEqual = compareFields<ChatDisplay>({
  idleVisibility: equalValue,
  contentMode: equalValue,
})

export const areChatProfilesEqual = compareFields<ChatProfile>({
  appearance: areAppearancesEqual,
  display: areDisplaysEqual,
})

const areLegacyCoordinatesEqual = compareFields<LegacyChatGeometry['coordinates']>({ x: equalValue, y: equalValue })
const areLegacySizesEqual = compareFields<LegacyChatGeometry['size']>({ width: equalValue, height: equalValue })
const areLegacyGeometriesEqual = compareFields<LegacyChatGeometry>({
  reference: equalValue,
  coordinates: areLegacyCoordinatesEqual,
  size: areLegacySizesEqual,
})
const arePlayerRectsEqual = compareFields<ChatGeometryV2['rect']>({
  x: equalValue,
  y: equalValue,
  width: equalValue,
  height: equalValue,
})
const arePlayerGeometriesEqual = compareFields<ChatGeometryV2>({
  reference: equalValue,
  rect: arePlayerRectsEqual,
  pinned: equalValue,
})

export const areChatGeometriesEqual = (left: ChatGeometry, right: ChatGeometry) => {
  if (left.reference !== right.reference) return false
  switch (left.reference) {
    case 'legacy-viewport-px':
      return right.reference === 'legacy-viewport-px' && areLegacyGeometriesEqual(left, right)
    case 'player':
      return right.reference === 'player' && arePlayerGeometriesEqual(left, right)
    default: {
      const unhandled: never = left
      void unhandled
      return false
    }
  }
}

export const arePresetEntriesEqual = (left: PresetEntry, right: PresetEntry) =>
  left.kind === right.kind &&
  left.id === right.id &&
  (left.kind === 'builtin' || (right.kind === 'custom' && left.name === right.name && areChatProfilesEqual(left.profile, right.profile)))

export const arePresetListsEqual = (left: PresetEntry[], right: PresetEntry[]) =>
  left.length === right.length &&
  left.every((preset, index) => {
    const rightPreset = right[index]
    return rightPreset !== undefined && arePresetEntriesEqual(preset, rightPreset)
  })

export const areChatAppearanceSettingsEqual = (
  left: Pick<ChatSettings, 'profile' | 'presets'>,
  right: Pick<ChatSettings, 'profile' | 'presets'>,
) => areChatProfilesEqual(left.profile, right.profile) && arePresetListsEqual(left.presets, right.presets)

export const areChatSettingsEqual = (left: ChatSettings, right: ChatSettings) =>
  areChatProfilesEqual(left.profile, right.profile) &&
  areChatGeometriesEqual(left.geometry, right.geometry) &&
  arePresetListsEqual(left.presets, right.presets)
