import { describe, expect, it } from 'vitest'
import { ylcInitSetting } from '@/shared/utils'
import {
  normalizeColor,
  normalizePersistedYTDLiveChatState,
  normalizePresetCollections,
  normalizeSettingsBackup,
  normalizeStyle,
} from './normalizeSettings'

describe('normalizeColor', () => {
  it('adds alpha and clamps invalid channels', () => {
    expect(normalizeColor({ r: -10, g: 999, b: Number.NaN }, { r: 10, g: 20, b: 30, a: 0.5 })).toEqual({ r: 0, g: 255, b: 30, a: 1 })
  })

  it('replaces non-finite alpha and channels', () => {
    expect(
      normalizeColor({ r: Number.POSITIVE_INFINITY, g: 20, b: 30, a: Number.NEGATIVE_INFINITY }, { r: 1, g: 2, b: 3, a: 0.4 }),
    ).toEqual({ r: 1, g: 20, b: 30, a: 1 })
  })
})

describe('normalizeStyle', () => {
  it('completes a partial style and clamps numeric fields', () => {
    expect(
      normalizeStyle({
        bgColor: { r: 0, g: 10, b: 20 },
        fontSize: 100,
        blur: -5,
        alwaysOnDisplay: false,
      }),
    ).toEqual({
      ...ylcInitSetting,
      bgColor: { r: 0, g: 10, b: 20, a: 1 },
      fontSize: 40,
      blur: 0,
      alwaysOnDisplay: false,
    })
  })
})

describe('normalizePresetCollections', () => {
  it('deduplicates ids and removes entries without an object style', () => {
    const result = normalizePresetCollections({
      presetItemIds: ['valid', 'missing', '', 'valid'],
      presetItemStyles: {
        valid: { fontSize: 18 },
        orphan: { fontSize: 12 },
      },
      presetItemTitles: {
        valid: 'Valid',
        orphan: 'Orphan',
      },
    })

    expect(result.presetItemIds).toEqual(['valid'])
    expect(result.presetItemStyles.valid).toEqual({
      ...ylcInitSetting,
      fontSize: 18,
    })
    expect(result.presetItemTitles).toEqual({ valid: 'Valid' })
  })
})

describe('normalizePersistedYTDLiveChatState', () => {
  it('normalizes style, geometry, and presets through one boundary', () => {
    const result = normalizePersistedYTDLiveChatState({
      fontSize: Number.NaN,
      bgColor: { r: 1, g: 2, b: 3 },
      coordinates: { x: Number.POSITIVE_INFINITY, y: 25 },
      size: { width: 10, height: 500 },
      presetItemIds: ['preset'],
      presetItemStyles: { preset: { fontSize: 16 } },
      presetItemTitles: { preset: 'Preset' },
    })

    expect(result.fontSize).toBe(ylcInitSetting.fontSize)
    expect(result.bgColor).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(result.coordinates).toEqual({ x: 20, y: 25 })
    expect(result.size).toEqual({ width: 300, height: 500 })
    expect(result.presetItemIds).toEqual(['preset'])
  })
})

describe('normalizeSettingsBackup', () => {
  const current = {
    globalSetting: { ytdLiveChat: true, themeMode: 'system' },
    ytdLiveChat: {
      ...ylcInitSetting,
      coordinates: { x: 20, y: 20 },
      size: { width: 400, height: 400 },
      presetItemIds: [],
      presetItemStyles: {},
      presetItemTitles: {},
      addPresetEnabled: true,
    },
  }

  it('requires the exact export version', () => {
    expect(normalizeSettingsBackup({ version: 2, globalSetting: {}, ytdLiveChat: {} }, current)).toBeNull()
  })

  it('normalizes imported partial data against current state', () => {
    const result = normalizeSettingsBackup(
      {
        version: 1,
        globalSetting: { themeMode: 'dark' },
        ytdLiveChat: { bgColor: { r: 10, g: 20, b: 30 } },
      },
      current,
    )

    expect(result?.globalSetting).toEqual({ ytdLiveChat: true, themeMode: 'dark' })
    expect(result?.ytdLiveChat.bgColor).toEqual({ r: 10, g: 20, b: 30, a: 1 })
  })
})
