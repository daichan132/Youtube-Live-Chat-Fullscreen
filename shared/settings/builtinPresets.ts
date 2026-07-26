import { DEFAULT_CHAT_PROFILE } from './defaults'
import type { BuiltinPresetId, ChatProfile } from './model'

type BuiltinPreset = {
  labelKey: string
  profile: ChatProfile
}

export const BUILTIN_PRESETS = {
  standard: {
    labelKey: 'content.preset.defaultTitle',
    profile: DEFAULT_CHAT_PROFILE,
  },
  transparent: {
    labelKey: 'content.preset.transparentTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 0, g: 0, b: 0, a: 0.22 },
        fontColor: { r: 255, g: 255, b: 255, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'Zen Maru Gothic',
        fontSize: 14,
        blur: 16,
        spacing: 6,
        showUserName: true,
        showUserIcon: true,
        showSuperChatBar: true,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'full-chat',
      },
    },
  },
  simple: {
    labelKey: 'content.preset.simpleTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 255, g: 255, b: 255, a: 0.74 },
        fontColor: { r: 17, g: 24, b: 39, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'Noto Sans JP',
        fontSize: 13,
        blur: 0,
        spacing: 8,
        showUserName: false,
        showUserIcon: false,
        showSuperChatBar: false,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'messages-only',
      },
    },
  },
  dark: {
    labelKey: 'content.preset.darkTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 2, g: 6, b: 23, a: 0.86 },
        fontColor: { r: 226, g: 232, b: 240, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'Inter',
        fontSize: 14,
        blur: 4,
        spacing: 2,
        showUserName: true,
        showUserIcon: true,
        showSuperChatBar: true,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'full-chat',
      },
    },
  },
  readable: {
    labelKey: 'content.preset.readableTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 255, g: 255, b: 255, a: 0.96 },
        fontColor: { r: 0, g: 0, b: 0, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'BIZ UDPGothic',
        fontSize: 18,
        blur: 0,
        spacing: 6,
        showUserName: false,
        showUserIcon: false,
        showSuperChatBar: false,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'messages-only',
      },
    },
  },
  compact: {
    labelKey: 'content.preset.compactTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 17, g: 24, b: 39, a: 0.72 },
        fontColor: { r: 243, g: 244, b: 246, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'Noto Sans',
        fontSize: 12,
        blur: 2,
        spacing: 0,
        showUserName: true,
        showUserIcon: false,
        showSuperChatBar: false,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'messages-only',
      },
    },
  },
  neon: {
    labelKey: 'content.preset.neonTitle',
    profile: {
      appearance: {
        backgroundColor: { r: 30, g: 16, b: 64, a: 0.58 },
        fontColor: { r: 217, g: 249, b: 157, a: 1 },
        membershipNameColor: { mode: 'youtube-default' },
        fontFamily: 'M PLUS Rounded 1c',
        fontSize: 14,
        blur: 14,
        spacing: 8,
        showUserName: true,
        showUserIcon: true,
        showSuperChatBar: true,
      },
      display: {
        idleVisibility: 'always-visible',
        contentMode: 'full-chat',
      },
    },
  },
} as const satisfies Record<BuiltinPresetId, BuiltinPreset>

export const getBuiltinPresetProfile = (id: BuiltinPresetId): ChatProfile => BUILTIN_PRESETS[id].profile
