import { describe, expect, it } from 'vitest'
import { areChatProfilesEqual, areChatSettingsEqual, areGlobalSettingsEqual } from './equality'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import type { ChatSettings } from './model'

const copySettings = (): ChatSettings => structuredClone(DEFAULT_CHAT_SETTINGS)

describe('settings equality', () => {
  it('compares global settings by their model fields', () => {
    expect(areGlobalSettingsEqual({ ytdLiveChat: true, themeMode: 'dark' }, { ytdLiveChat: true, themeMode: 'dark' })).toBe(true)
    expect(areGlobalSettingsEqual({ ytdLiveChat: true, themeMode: 'dark' }, { ytdLiveChat: false, themeMode: 'dark' })).toBe(false)
  })

  it('detects nested profile changes without serializing settings', () => {
    const left = copySettings()
    const right = copySettings()
    expect(areChatProfilesEqual(left.profile, right.profile)).toBe(true)
    right.profile.appearance.backgroundColor.a = 0.25
    expect(areChatProfilesEqual(left.profile, right.profile)).toBe(false)
  })

  it('compares geometry and ordered presets', () => {
    const left = copySettings()
    const right = copySettings()
    expect(areChatSettingsEqual(left, right)).toBe(true)
    right.geometry.coordinates.x += 1
    expect(areChatSettingsEqual(left, right)).toBe(false)

    right.geometry.coordinates.x = left.geometry.coordinates.x
    right.presets.reverse()
    expect(areChatSettingsEqual(left, right)).toBe(false)
  })
})
