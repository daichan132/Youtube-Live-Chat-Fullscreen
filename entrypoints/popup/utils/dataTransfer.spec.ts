import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ylcInitSetting } from '@/shared/utils'
import { buildExportData, isValidImportData, persistImportedSettings, sanitizeGlobalSetting, sanitizeYTDLiveChat } from './dataTransfer'

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

describe('isValidImportData', () => {
  it('accepts the current exact version', () => {
    expect(isValidImportData({ version: 1, exportedAt: '', globalSetting: {}, ytdLiveChat: {} })).toBe(true)
  })

  it.each([
    null,
    undefined,
    42,
    'string',
    { globalSetting: {}, ytdLiveChat: {} },
    { version: 2, globalSetting: {}, ytdLiveChat: {} },
    { version: 1, ytdLiveChat: {} },
    { version: 1, globalSetting: {} },
  ])('rejects %j', input => {
    expect(isValidImportData(input)).toBe(false)
  })
})

describe('sanitizeGlobalSetting', () => {
  it('picks only valid fields', () => {
    expect(sanitizeGlobalSetting({ ytdLiveChat: false, themeMode: 'dark', extra: true })).toEqual({
      ytdLiveChat: false,
      themeMode: 'dark',
    })
  })
})

describe('sanitizeYTDLiveChat', () => {
  it('normalizes partial styles, colors, geometry, and preset integrity', () => {
    const result = sanitizeYTDLiveChat({
      bgColor: { r: -1, g: 20, b: 300 },
      fontSize: Number.NaN,
      coordinates: { x: Number.POSITIVE_INFINITY, y: 30 },
      size: { width: 10, height: 400 },
      presetItemIds: ['valid', 'missing', 'valid'],
      presetItemStyles: {
        valid: { fontSize: 20, bgColor: { r: 0, g: 0, b: 0 } },
      },
      presetItemTitles: { valid: 'Valid', missing: 'Missing' },
    })

    expect(result.bgColor).toEqual({ r: 0, g: 20, b: 255, a: 1 })
    expect(result.fontSize).toBe(ylcInitSetting.fontSize)
    expect(result.coordinates).toEqual({ x: 20, y: 30 })
    expect(result.size).toEqual({ width: 300, height: 400 })
    expect(result.presetItemIds).toEqual(['valid'])
    expect((result.presetItemStyles as Record<string, unknown>).valid).toEqual({
      ...ylcInitSetting,
      bgColor: { r: 0, g: 0, b: 0, a: 1 },
      fontSize: 20,
    })
  })
})

describe('export and persistence', () => {
  beforeEach(() => {
    storageSet.mockReset()
    storageSet.mockResolvedValue(undefined)
  })

  it('exports the current schema version', () => {
    expect(buildExportData().version).toBe(1)
  })

  it('awaits normalized writes using shared persist versions', async () => {
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
      version: 6,
      state: { bgColor: { r: 10, g: 20, b: 30, a: 1 } },
    })
  })
})
