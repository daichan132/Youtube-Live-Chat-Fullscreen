import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import { buildExportData, isValidImportData, normalizeImport, sanitizeChatSettings, sanitizeGlobalSetting } from './dataTransfer'

const store = createStore()

describe('backup validation', () => {
  it('accepts v2 and legacy v1 backups', () => {
    expect(isValidImportData(store, { version: 2, exportedAt: '', globalSetting: {}, chatSettings: {} })).toBe(true)
    expect(isValidImportData(store, { version: 1, exportedAt: '', globalSetting: {}, ytdLiveChat: {} })).toBe(true)
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
    expect(isValidImportData(store, input)).toBe(false)
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
    const result = sanitizeChatSettings(store, {
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
      reference: 'legacy-viewport-px',
      coordinates: { x: 20, y: 30 },
      size: { width: 240, height: 400 },
    })
    expect(result.presets).toEqual([])
  })
})

describe('export and persistence', () => {
  beforeEach(() => {
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
  })

  it('exports the current schema without legacy collections', () => {
    const exported = buildExportData(store)
    expect(exported.version).toBe(2)
    expect(exported.chatSettings).toEqual(DEFAULT_CHAT_SETTINGS)
    expect(exported).not.toHaveProperty('ytdLiveChat')
  })

  it('normalizes legacy data before the runtime persists it', () => {
    const normalized = normalizeImport(store, {
      version: 1,
      exportedAt: '',
      globalSetting: { themeMode: 'dark' },
      ytdLiveChat: {
        bgColor: { r: 10, g: 20, b: 30 },
      },
    })
    expect(normalized.globalSetting.themeMode).toBe('dark')
    expect(normalized.chatSettings.profile.appearance.backgroundColor).toEqual({ r: 10, g: 20, b: 30, a: 1 })
  })
})
