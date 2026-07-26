import { describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import {
  normalizeChatGeometry,
  normalizeChatProfile,
  normalizeChatSettings,
  normalizeMembershipNameColor,
  normalizePresets,
  normalizeRGBA,
} from './normalizeSettings'

describe('normalizeRGBA', () => {
  it('clamps channels and preserves the fallback alpha for invalid input', () => {
    expect(normalizeRGBA({ r: -10, g: 999, b: Number.NaN }, { r: 10, g: 20, b: 30, a: 0.5 })).toEqual({
      r: 0,
      g: 255,
      b: 30,
      a: 0.5,
    })
  })
})

describe('normalizeChatProfile', () => {
  it('normalizes the nested v7 profile without creating legacy fields', () => {
    const result = normalizeChatProfile({
      appearance: {
        backgroundColor: { r: 0, g: 10, b: 20 },
        membershipNameColor: { mode: 'custom', value: { r: 1, g: 2, b: 3 } },
        fontSize: 100,
        blur: -5,
        fontFamily: '',
      },
      display: {
        idleVisibility: 'auto-hide',
        contentMode: 'messages-only',
      },
    })

    expect(result.appearance.backgroundColor).toEqual({ r: 0, g: 10, b: 20, a: 1 })
    expect(result.appearance.membershipNameColor).toEqual({
      mode: 'custom',
      value: { r: 1, g: 2, b: 3, a: 1 },
    })
    expect(result.appearance.fontSize).toBe(40)
    expect(result.appearance.blur).toBe(0)
    expect(result.appearance.fontFamily).toBeNull()
    expect(result.display).toEqual({
      idleVisibility: 'auto-hide',
      contentMode: 'messages-only',
    })
    expect(result).not.toHaveProperty('bgColor')
    expect(result).not.toHaveProperty('alwaysOnDisplay')
  })

  it('keeps the YouTube membership color as an explicit mode', () => {
    expect(normalizeMembershipNameColor({ mode: 'youtube-default' })).toEqual({ mode: 'youtube-default' })
  })
})

describe('normalizeChatGeometry', () => {
  it('enforces finite coordinates and minimum sizes', () => {
    expect(
      normalizeChatGeometry({
        coordinates: { x: Number.POSITIVE_INFINITY, y: 25 },
        size: { width: 10, height: 500 },
      }),
    ).toEqual({
      coordinates: { x: 20, y: 25 },
      size: { width: 300, height: 500 },
    })
  })
})

describe('normalizePresets', () => {
  it('keeps one self-contained entry per id', () => {
    const presets = normalizePresets(
      [
        { kind: 'builtin', id: 'standard' },
        { kind: 'builtin', id: 'standard' },
        {
          kind: 'custom',
          id: 'custom',
          name: 'Custom',
          profile: { appearance: { fontSize: 18 } },
        },
        { kind: 'custom', id: 'transparent', name: 'Collision', profile: {} },
      ],
      [],
    )

    expect(presets).toHaveLength(2)
    expect(presets[0]).toEqual({ kind: 'builtin', id: 'standard' })
    expect(presets[1]).toMatchObject({
      kind: 'custom',
      id: 'custom',
      name: 'Custom',
      profile: { appearance: { fontSize: 18 } },
    })
  })
})

describe('normalizeChatSettings', () => {
  it('returns only profile, geometry, and presets', () => {
    const result = normalizeChatSettings(
      {
        profile: {},
        geometry: {},
        presets: [],
        addPresetEnabled: false,
        presetItemIds: ['legacy'],
      },
      DEFAULT_CHAT_SETTINGS,
    )

    expect(Object.keys(result)).toEqual(['profile', 'geometry', 'presets'])
    expect(result.presets).toEqual([])
  })
})
