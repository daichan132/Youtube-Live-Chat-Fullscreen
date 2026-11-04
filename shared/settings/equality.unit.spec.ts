import { describe, expect, it } from 'vitest'
import { areChatGeometriesEqual, areChatProfilesEqual, areChatSettingsEqual, areGlobalSettingsEqual, areRGBAEqual } from './equality'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import type {
  ChatAppearance,
  ChatDisplay,
  ChatGeometry,
  ChatGeometryV2,
  ChatProfile,
  ChatSettings,
  LegacyChatGeometry,
  RGBA,
} from './model'

const copySettings = (): ChatSettings => structuredClone(DEFAULT_CHAT_SETTINGS)

describe('settings equality', () => {
  it('compares global settings by their model fields', () => {
    expect(areGlobalSettingsEqual({ ytdLiveChat: true, themeMode: 'dark' }, { ytdLiveChat: true, themeMode: 'dark' })).toBe(true)
    expect(areGlobalSettingsEqual({ ytdLiveChat: true, themeMode: 'dark' }, { ytdLiveChat: false, themeMode: 'dark' })).toBe(false)
  })

  it('detects nested profile changes', () => {
    const left = copySettings()
    const right = copySettings()
    expect(areChatProfilesEqual(left.profile, right.profile)).toBe(true)
    right.profile.appearance.backgroundColor.a = 0.25
    expect(areChatProfilesEqual(left.profile, right.profile)).toBe(false)
  })

  it('compares each color channel', () => {
    const color: RGBA = { r: 1, g: 2, b: 3, a: 0.5 }
    for (const channel of ['r', 'g', 'b', 'a'] as const satisfies readonly (keyof RGBA)[]) {
      expect(areRGBAEqual(color, { ...color, [channel]: color[channel] + 1 })).toBe(false)
    }
    expect(areRGBAEqual(color, { ...color })).toBe(true)
  })

  it('detects a change to each appearance and display setting', () => {
    const changes = {
      backgroundColor: profile => {
        profile.appearance.backgroundColor.r = 0
      },
      fontColor: profile => {
        profile.appearance.fontColor.g = 255
      },
      membershipNameColor: profile => {
        profile.appearance.membershipNameColor = { mode: 'custom', value: { r: 0, g: 0, b: 0, a: 1 } }
      },
      fontFamily: profile => {
        profile.appearance.fontFamily = 'Arial'
      },
      fontSize: profile => {
        profile.appearance.fontSize += 1
      },
      blur: profile => {
        profile.appearance.blur += 1
      },
      spacing: profile => {
        profile.appearance.spacing += 1
      },
      showUserName: profile => {
        profile.appearance.showUserName = !profile.appearance.showUserName
      },
      showUserIcon: profile => {
        profile.appearance.showUserIcon = !profile.appearance.showUserIcon
      },
      showSuperChatBar: profile => {
        profile.appearance.showSuperChatBar = !profile.appearance.showSuperChatBar
      },
      idleVisibility: profile => {
        profile.display.idleVisibility = 'auto-hide'
      },
      contentMode: profile => {
        profile.display.contentMode = 'messages-only'
      },
    } satisfies Record<keyof ChatAppearance | keyof ChatDisplay, (profile: ChatProfile) => void>

    for (const change of Object.values(changes)) {
      const left = copySettings().profile
      const right = structuredClone(left)
      change(right)
      expect(areChatProfilesEqual(left, right)).toBe(false)
      expect(areChatProfilesEqual(right, left)).toBe(false)
    }
  })

  it('compares every player geometry value and distinguishes legacy geometry', () => {
    const player: ChatGeometryV2 = { reference: 'player', rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, pinned: false }
    const legacy: LegacyChatGeometry = { reference: 'legacy-viewport-px', coordinates: { x: 10, y: 20 }, size: { width: 300, height: 200 } }
    expect(areChatGeometriesEqual(player, structuredClone(player))).toBe(true)
    expect(areChatGeometriesEqual(player, legacy)).toBe(false)
    expect(areChatGeometriesEqual(legacy, player)).toBe(false)
    for (const key of ['x', 'y', 'width', 'height'] as const satisfies readonly (keyof ChatGeometryV2['rect'])[]) {
      const changed = structuredClone(player)
      changed.rect[key] += 1
      expect(areChatGeometriesEqual(player, changed)).toBe(false)
    }
    expect(areChatGeometriesEqual(player, { ...player, pinned: true })).toBe(false)
  })

  it('compares every legacy geometry value', () => {
    const legacy: LegacyChatGeometry = { reference: 'legacy-viewport-px', coordinates: { x: 10, y: 20 }, size: { width: 300, height: 200 } }
    expect(areChatGeometriesEqual(legacy, structuredClone(legacy))).toBe(true)
    for (const key of ['x', 'y'] as const satisfies readonly (keyof LegacyChatGeometry['coordinates'])[]) {
      const changed = structuredClone(legacy)
      changed.coordinates[key] += 1
      expect(areChatGeometriesEqual(legacy, changed)).toBe(false)
    }
    for (const key of ['width', 'height'] as const satisfies readonly (keyof LegacyChatGeometry['size'])[]) {
      const changed = structuredClone(legacy)
      changed.size[key] += 1
      expect(areChatGeometriesEqual(legacy, changed)).toBe(false)
    }
  })

  it('treats an unrecognized runtime geometry reference as unequal', () => {
    const unknown = { reference: 'unrecognized' } as unknown as ChatGeometry
    expect(areChatGeometriesEqual(unknown, unknown)).toBe(false)
  })

  it('compares geometry and ordered presets', () => {
    const left = copySettings()
    const right = copySettings()
    expect(areChatSettingsEqual(left, right)).toBe(true)
    if (right.geometry.reference !== 'player' || left.geometry.reference !== 'player') throw new Error('Expected player geometry')
    right.geometry.rect.x += 0.01
    expect(areChatSettingsEqual(left, right)).toBe(false)

    right.geometry.rect.x = left.geometry.rect.x
    right.presets.reverse()
    expect(areChatSettingsEqual(left, right)).toBe(false)
  })
})
