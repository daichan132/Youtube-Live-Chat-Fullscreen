import type { ChatGeometryV2, ChatProfile, RGBA } from './model'

export const LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR: RGBA = {
  r: 15,
  g: 157,
  b: 88,
  a: 1,
}

export const DEFAULT_CHAT_PROFILE: ChatProfile = {
  appearance: {
    backgroundColor: { r: 255, g: 255, b: 255, a: 1 },
    fontColor: { r: 0, g: 0, b: 0, a: 1 },
    membershipNameColor: { mode: 'youtube-default' },
    fontFamily: null,
    fontSize: 13,
    blur: 0,
    spacing: 0,
    showUserName: true,
    showUserIcon: true,
    showSuperChatBar: true,
  },
  display: {
    idleVisibility: 'always-visible',
    contentMode: 'full-chat',
  },
}

export const DEFAULT_CHAT_GEOMETRY: ChatGeometryV2 = {
  reference: 'player',
  rect: {
    x: 0.015625,
    y: 0.027778,
    width: 0.3125,
    height: 0.555556,
  },
  pinned: false,
}
