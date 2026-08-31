import { describe, expect, it } from 'vitest'
import { buildSettingsBackup, normalizeSettingsBackup } from './backup'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'

const current = {
  globalSetting: { ytdLiveChat: true, themeMode: 'system' },
  chatSettings: DEFAULT_CHAT_SETTINGS,
}

describe('settings backup', () => {
  it('exports only the v7 chat settings shape', () => {
    const backup = buildSettingsBackup(current, '2026-07-26T00:00:00.000Z')

    expect(backup).toMatchObject({
      version: 2,
      exportedAt: '2026-07-26T00:00:00.000Z',
      chatSettings: {
        profile: {},
        geometry: {},
        presets: DEFAULT_CHAT_SETTINGS.presets,
      },
    })
    expect(backup).not.toHaveProperty('ytdLiveChat')
    expect(backup.chatSettings).not.toHaveProperty('addPresetEnabled')
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

  it('rejects backups with more than 100 custom presets', () => {
    const presets = Array.from({ length: 101 }, (_, index) => ({
      kind: 'custom',
      id: `custom-${index}`,
      name: `Preset ${index}`,
      profile: DEFAULT_CHAT_SETTINGS.profile,
    }))

    expect(
      normalizeSettingsBackup(
        {
          version: 2,
          globalSetting: {},
          chatSettings: { ...DEFAULT_CHAT_SETTINGS, presets },
        },
        current,
      ),
    ).toBeNull()
  })

  it('rejects unknown versions', () => {
    expect(normalizeSettingsBackup({ version: 3, globalSetting: {}, chatSettings: {} }, current)).toBeNull()
  })
})
