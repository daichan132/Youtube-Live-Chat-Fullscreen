export type RGBA = {
  r: number
  g: number
  b: number
  a: number
}

export type GlobalSettings = {
  ytdLiveChat: boolean
  themeMode: 'light' | 'dark' | 'system'
}

export type MembershipNameColor =
  | {
      mode: 'youtube-default'
    }
  | {
      mode: 'custom'
      value: RGBA
    }

export type ChatAppearance = {
  backgroundColor: RGBA
  fontColor: RGBA
  membershipNameColor: MembershipNameColor
  fontFamily: string | null
  fontSize: number
  blur: number
  spacing: number
  showUserName: boolean
  showUserIcon: boolean
  showSuperChatBar: boolean
}

export type ChatDisplay = {
  idleVisibility: 'auto-hide' | 'always-visible'
  contentMode: 'full-chat' | 'messages-only'
}

export type ChatProfile = {
  appearance: ChatAppearance
  display: ChatDisplay
}

export type ChatGeometry = {
  coordinates: {
    x: number
    y: number
  }
  size: {
    width: number
    height: number
  }
}

export const BUILTIN_PRESET_IDS = ['standard', 'transparent', 'simple', 'dark', 'readable', 'compact', 'neon'] as const

export type BuiltinPresetId = (typeof BUILTIN_PRESET_IDS)[number]

export type PresetEntry =
  | {
      kind: 'builtin'
      id: BuiltinPresetId
    }
  | {
      kind: 'custom'
      id: string
      name: string
      profile: ChatProfile
    }

export type ChatSettings = {
  profile: ChatProfile
  geometry: ChatGeometry
  presets: PresetEntry[]
}
