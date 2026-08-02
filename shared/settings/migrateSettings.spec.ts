import { describe, expect, it } from 'vitest'
import { LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from './defaults'
import { migrateSettings, migrateV6ToV7 } from './migrateSettings'

describe('migrateV6ToV7', () => {
  it('preserves profile, geometry, and custom presets while removing parallel collections', () => {
    const migrated = migrateV6ToV7({
      bgColor: { r: 10, g: 20, b: 30, a: 0.4 },
      fontColor: { r: 240, g: 230, b: 220, a: 1 },
      membershipNameColor: { r: 1, g: 2, b: 3, a: 0.5 },
      fontFamily: 'Inter',
      fontSize: 19,
      blur: 7,
      space: 9,
      alwaysOnDisplay: false,
      chatOnlyDisplay: true,
      userNameDisplay: false,
      userIconDisplay: true,
      superChatBarDisplay: false,
      coordinates: { x: 72, y: 48 },
      size: { width: 640, height: 480 },
      presetItemIds: ['default1', 'custom'],
      presetItemTitles: { custom: '配信用' },
      presetItemStyles: {
        custom: {
          fontSize: 20,
          membershipNameColor: LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR,
        },
      },
      addPresetEnabled: false,
    })

    expect(migrated.profile).toEqual({
      appearance: {
        backgroundColor: { r: 10, g: 20, b: 30, a: 0.4 },
        fontColor: { r: 240, g: 230, b: 220, a: 1 },
        membershipNameColor: { mode: 'custom', value: { r: 1, g: 2, b: 3, a: 0.5 } },
        fontFamily: 'Inter',
        fontSize: 19,
        blur: 7,
        spacing: 9,
        showUserName: false,
        showUserIcon: true,
        showSuperChatBar: false,
      },
      display: {
        idleVisibility: 'auto-hide',
        contentMode: 'messages-only',
      },
    })
    expect(migrated.geometry).toEqual({
      reference: 'legacy-viewport-px',
      coordinates: { x: 72, y: 48 },
      size: { width: 640, height: 480 },
    })
    expect(migrated.presets).toEqual([
      { kind: 'builtin', id: 'standard' },
      {
        kind: 'custom',
        id: 'custom',
        name: '配信用',
        profile: expect.objectContaining({
          appearance: expect.objectContaining({
            fontSize: 20,
            membershipNameColor: { mode: 'youtube-default' },
          }),
        }),
      },
      { kind: 'builtin', id: 'dark' },
      { kind: 'builtin', id: 'readable' },
      { kind: 'builtin', id: 'compact' },
      { kind: 'builtin', id: 'neon' },
    ])
    expect(migrated).not.toHaveProperty('addPresetEnabled')
    expect(migrated).not.toHaveProperty('presetItemIds')
  })

  it('preserves a custom-only preset list without adding built-ins', () => {
    expect(
      migrateV6ToV7({
        presetItemIds: ['custom'],
        presetItemTitles: { custom: 'Custom' },
        presetItemStyles: { custom: { fontSize: 18 } },
      }).presets,
    ).toMatchObject([{ kind: 'custom', id: 'custom', name: 'Custom' }])
  })

  it('uses the YouTube default mode for the old sentinel membership color', () => {
    expect(
      migrateV6ToV7({
        membershipNameColor: LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR,
      }).profile.appearance.membershipNameColor,
    ).toEqual({ mode: 'youtube-default' })
  })
})

describe('migrateSettings', () => {
  it('normalizes v7 without retaining unknown or legacy fields', () => {
    const migrated = migrateSettings({
      profile: {
        appearance: { fontSize: 18 },
        display: { idleVisibility: 'auto-hide' },
      },
      geometry: {},
      presets: [],
      bgColor: { r: 1, g: 2, b: 3 },
    })

    expect(migrated.profile.appearance.fontSize).toBe(18)
    expect(migrated.profile.display.idleVisibility).toBe('auto-hide')
    expect(migrated).not.toHaveProperty('bgColor')
  })
})
