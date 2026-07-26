import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSettingsStore } from '@/shared/settings/chatSettingsStore'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { buildExportData, isValidImportData, persistImportedSettings, sanitizeChatSettings, sanitizeGlobalSetting } from './dataTransfer'

const storageSet = vi.hoisted(() => vi.fn())

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        set: storageSet,
      },
    },
  },
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('backup validation', () => {
  it('accepts v2 and legacy v1 backups', () => {
    expect(isValidImportData({ version: 2, exportedAt: '', globalSetting: {}, chatSettings: {} })).toBe(true)
    expect(isValidImportData({ version: 1, exportedAt: '', globalSetting: {}, ytdLiveChat: {} })).toBe(true)
  })

  it.each([
    null,
    undefined,
    42,
    'string',
    { globalSetting: {}, chatSettings: {} },
    { version: 3, globalSetting: {}, chatSettings: {} },
    { version: 2, globalSetting: {} },
  ])('rejects %j', input => {
    expect(isValidImportData(input)).toBe(false)
  })
})

describe('sanitizers', () => {
  it('picks only valid global fields', () => {
    expect(sanitizeGlobalSetting({ ytdLiveChat: false, themeMode: 'dark', extra: true })).toEqual({
      ytdLiveChat: false,
      themeMode: 'dark',
    })
  })

  it('normalizes v7 nested settings', () => {
    const result = sanitizeChatSettings({
      profile: {
        appearance: {
          backgroundColor: { r: -1, g: 20, b: 300 },
          fontSize: Number.NaN,
        },
      },
      geometry: {
        coordinates: { x: Number.POSITIVE_INFINITY, y: 30 },
        size: { width: 10, height: 400 },
      },
      presets: [],
    })

    expect(result.profile.appearance.backgroundColor).toEqual({ r: 0, g: 20, b: 255, a: 1 })
    expect(result.profile.appearance.fontSize).toBe(DEFAULT_CHAT_SETTINGS.profile.appearance.fontSize)
    expect(result.geometry).toEqual({
      coordinates: { x: 20, y: 30 },
      size: { width: 300, height: 400 },
    })
    expect(result.presets).toEqual([])
  })
})

describe('export and persistence', () => {
  beforeEach(() => {
    storageSet.mockReset()
    storageSet.mockResolvedValue(undefined)
    useChatSettingsStore.setState(DEFAULT_CHAT_SETTINGS)
  })

  it('exports the current schema without legacy collections', () => {
    const exported = buildExportData()
    expect(exported.version).toBe(2)
    expect(exported.chatSettings).toEqual(DEFAULT_CHAT_SETTINGS)
    expect(exported).not.toHaveProperty('ytdLiveChat')
  })

  it('awaits v7 normalized writes', async () => {
    await persistImportedSettings({
      version: 1,
      exportedAt: '',
      globalSetting: { themeMode: 'dark' },
      ytdLiveChat: {
        bgColor: { r: 10, g: 20, b: 30 },
      },
    })

    expect(storageSet).toHaveBeenCalledTimes(1)
    const persisted = storageSet.mock.calls[0]?.[0] as Record<string, string>
    expect(JSON.parse(persisted.globalSettingStore ?? '')).toMatchObject({
      version: 1,
      state: { themeMode: 'dark' },
    })
    expect(JSON.parse(persisted.ytdLiveChatStore ?? '')).toMatchObject({
      version: 7,
      state: {
        profile: {
          appearance: {
            backgroundColor: { r: 10, g: 20, b: 30, a: 1 },
          },
        },
        geometry: {},
        presets: DEFAULT_CHAT_SETTINGS.presets,
      },
    })
  })
})
