import type { ChatGeometry, ChatProfile, ChatSettings, GlobalSettings, MembershipNameColor, PresetEntry, RGBA } from './model'

const areRGBAEqual = (left: RGBA, right: RGBA) => left.r === right.r && left.g === right.g && left.b === right.b && left.a === right.a

const areMembershipColorsEqual = (left: MembershipNameColor, right: MembershipNameColor) =>
  left.mode === right.mode && (left.mode === 'youtube-default' || (right.mode === 'custom' && areRGBAEqual(left.value, right.value)))

export const areGlobalSettingsEqual = (left: GlobalSettings, right: GlobalSettings) =>
  left.ytdLiveChat === right.ytdLiveChat && left.themeMode === right.themeMode

export const areChatProfilesEqual = (left: ChatProfile, right: ChatProfile) => {
  const leftAppearance = left.appearance
  const rightAppearance = right.appearance
  return (
    areRGBAEqual(leftAppearance.backgroundColor, rightAppearance.backgroundColor) &&
    areRGBAEqual(leftAppearance.fontColor, rightAppearance.fontColor) &&
    areMembershipColorsEqual(leftAppearance.membershipNameColor, rightAppearance.membershipNameColor) &&
    leftAppearance.fontFamily === rightAppearance.fontFamily &&
    leftAppearance.fontSize === rightAppearance.fontSize &&
    leftAppearance.blur === rightAppearance.blur &&
    leftAppearance.spacing === rightAppearance.spacing &&
    leftAppearance.showUserName === rightAppearance.showUserName &&
    leftAppearance.showUserIcon === rightAppearance.showUserIcon &&
    leftAppearance.showSuperChatBar === rightAppearance.showSuperChatBar &&
    left.display.idleVisibility === right.display.idleVisibility &&
    left.display.contentMode === right.display.contentMode
  )
}

const areGeometriesEqual = (left: ChatGeometry, right: ChatGeometry) => {
  if (left.reference !== right.reference) return false
  if (left.reference === 'legacy-viewport-px') {
    return (
      right.reference === 'legacy-viewport-px' &&
      left.coordinates.x === right.coordinates.x &&
      left.coordinates.y === right.coordinates.y &&
      left.size.width === right.size.width &&
      left.size.height === right.size.height
    )
  }
  return (
    right.reference === 'player' &&
    left.rect.x === right.rect.x &&
    left.rect.y === right.rect.y &&
    left.rect.width === right.rect.width &&
    left.rect.height === right.rect.height &&
    left.pinned === right.pinned
  )
}

const arePresetsEqual = (left: PresetEntry, right: PresetEntry) =>
  left.kind === right.kind &&
  left.id === right.id &&
  (left.kind === 'builtin' || (right.kind === 'custom' && left.name === right.name && areChatProfilesEqual(left.profile, right.profile)))

export const areChatSettingsEqual = (left: ChatSettings, right: ChatSettings) =>
  areChatProfilesEqual(left.profile, right.profile) &&
  areGeometriesEqual(left.geometry, right.geometry) &&
  left.presets.length === right.presets.length &&
  left.presets.every((preset, index) => arePresetsEqual(preset, right.presets[index]))
