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
import { MAX_CUSTOM_PRESETS } from './persistConfig'

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
      reference: 'legacy-viewport-px',
      coordinates: { x: 20, y: 25 },
      size: { width: 240, height: 500 },
    })
  })

  it('clamps player ratios while preserving the manual pin state', () => {
    expect(
      normalizeChatGeometry({
        reference: 'player',
        rect: { x: 0.8, y: -1, width: 0.8, height: 2 },
        pinned: true,
      }),
    ).toEqual({
      reference: 'player',
      rect: { x: 0.35, y: 0, width: 0.65, height: 0.9 },
      pinned: true,
    })
  })

  it('preserves valid geometry fallbacks when stored values are incomplete', () => {
    const playerFallback = {
      reference: 'player',
      rect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      pinned: true,
    } as const
    expect(
      normalizeChatGeometry(
        {
          reference: 'player',
          rect: { x: Number.NaN, y: null, width: undefined, height: 'invalid' },
        },
        playerFallback,
      ),
    ).toEqual(playerFallback)

    const legacyFallback = {
      reference: 'legacy-viewport-px',
      coordinates: { x: 32, y: 48 },
      size: { width: 420, height: 360 },
    } as const
    expect(normalizeChatGeometry({}, legacyFallback)).toEqual(legacyFallback)
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

  it('keeps built-in entries while capping custom presets from storage', () => {
    const customPresets = Array.from({ length: MAX_CUSTOM_PRESETS + 2 }, (_, index) => ({
      kind: 'custom',
      id: `custom-${index}`,
      name: `Custom ${index}`,
      profile: {},
    }))

    const presets = normalizePresets([{ kind: 'builtin', id: 'standard' }, ...customPresets, { kind: 'builtin', id: 'transparent' }], [])

    expect(presets.filter(preset => preset.kind === 'custom')).toHaveLength(MAX_CUSTOM_PRESETS)
    expect(presets.filter(preset => preset.kind === 'builtin').map(preset => preset.id)).toEqual(['standard', 'transparent'])
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
