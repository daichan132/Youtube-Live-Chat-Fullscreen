import { describe, expect, it } from 'vitest'
import { buildSettingsBackup, normalizeSettingsBackup } from './backup'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import type { ChatProfile, ChatSettings } from './model'

const current = {
  globalSetting: { ytdLiveChat: true, themeMode: 'system' },
  chatSettings: DEFAULT_CHAT_SETTINGS,
}

describe('settings backup', () => {
  it('exports the complete chosen settings without language or private editing state', () => {
    const profile = {
      appearance: {
        backgroundColor: { r: 12, g: 34, b: 56, a: 0.4 },
        fontColor: { r: 240, g: 230, b: 220, a: 1 },
        membershipNameColor: { mode: 'custom', value: { r: 10, g: 90, b: 150, a: 0.8 } },
        fontFamily: 'Inter',
        fontSize: 27,
        blur: 6,
        spacing: 9,
        showUserName: false,
        showUserIcon: false,
        showSuperChatBar: false,
      },
      display: { idleVisibility: 'auto-hide', contentMode: 'messages-only' },
    } satisfies ChatProfile
    const savedProfile = { ...profile, appearance: { ...profile.appearance, fontSize: 32, spacing: 3 } }
    const chatSettings = {
      profile,
      geometry: { reference: 'player', rect: { x: 0.2, y: 0.1, width: 0.3, height: 0.4 }, pinned: true },
      presets: [
        { kind: 'builtin', id: 'dark' },
        { kind: 'custom', id: 'reading', name: 'Reading', profile: savedProfile },
      ],
    } satisfies ChatSettings
    const input = {
      // Global compatibility input accepts unknown keys; the public backup must not expose them.
      globalSetting: {
        ytdLiveChat: false,
        themeMode: 'dark',
        locale: 'ja',
        editorSession: { draftProfile: savedProfile, past: [profile], future: [], activeGesture: null },
      },
      chatSettings: structuredClone(chatSettings),
    } satisfies Parameters<typeof buildSettingsBackup>[0]

    const json = JSON.parse(JSON.stringify(buildSettingsBackup(input, '2026-07-26T00:00:00.000Z')))

    expect(json).toStrictEqual({
      version: 2,
      exportedAt: '2026-07-26T00:00:00.000Z',
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      chatSettings,
    })
  })

  it('normalizes a v2 backup', () => {
    const normalized = normalizeSettingsBackup(
      {
        version: 2,
        globalSetting: { themeMode: 'dark' },
        chatSettings: {
          profile: {
            appearance: { fontSize: 22 },
          },
        },
      },
      current,
    )

    expect(normalized?.globalSetting).toEqual({ ytdLiveChat: true, themeMode: 'dark' })
    expect(normalized?.chatSettings.profile.appearance.fontSize).toBe(22)
  })

  it('imports a version 1 backup through the v6 to v7 migration', () => {
    const normalized = normalizeSettingsBackup(
      {
        version: 1,
        exportedAt: '',
        globalSetting: { ytdLiveChat: false },
        ytdLiveChat: {
          fontSize: 20,
          bgColor: { r: 10, g: 20, b: 30 },
          presetItemIds: [],
          presetItemStyles: {},
          presetItemTitles: {},
        },
      },
      current,
    )

    expect(normalized?.version).toBe(2)
    expect(normalized?.globalSetting).toEqual({ ytdLiveChat: false, themeMode: 'system' })
    expect(normalized?.chatSettings.profile.appearance).toMatchObject({
      fontSize: 20,
      backgroundColor: { r: 10, g: 20, b: 30, a: 1 },
    })
    expect(normalized?.chatSettings.presets).toEqual([])
  })

  it('accepts 100 custom presets plus built-ins and rejects a 101st custom preset', () => {
    const customPresets = Array.from({ length: 100 }, (_, index) => ({
      kind: 'custom' as const,
      id: `custom-${index}`,
      name: `Preset ${index}`,
      profile: {
        ...DEFAULT_CHAT_SETTINGS.profile,
        appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 24 },
      },
    }))
    const presets = [{ kind: 'builtin' as const, id: 'dark' as const }, ...customPresets]
    const backup = { version: 2, globalSetting: {}, chatSettings: { ...DEFAULT_CHAT_SETTINGS, presets } }

    expect(normalizeSettingsBackup(structuredClone(backup), current)?.chatSettings.presets).toEqual(presets)

    expect(
      normalizeSettingsBackup(
        {
          ...backup,
          chatSettings: { ...backup.chatSettings, presets: [...presets, { ...customPresets[0], id: 'custom-100' }] },
        },
        current,
      ),
    ).toBeNull()
  })

  it('rejects unknown versions', () => {
    expect(normalizeSettingsBackup({ version: 3, globalSetting: {}, chatSettings: {} }, current)).toBeNull()
  })
})
