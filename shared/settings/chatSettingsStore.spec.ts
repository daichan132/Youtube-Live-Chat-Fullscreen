import { createStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'
import { chatSettingsStateAtom } from '@/shared/state/atoms'
import {
  addPresetAtom,
  commitGeometryAtom,
  commitProfileAtom,
  deletePresetAtom,
  reorderPresetsAtom,
  updatePresetNameAtom,
} from '@/shared/state/commands'
import { DEFAULT_CHAT_SETTINGS, migrateSettings } from './migrateSettings'

describe('chat settings commands', () => {
  it('initializes one normalized v7 settings model', () => {
    const store = createStore()
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    const state = store.get(chatSettingsStateAtom)
    expect(state.profile).toEqual(DEFAULT_CHAT_SETTINGS.profile)
    expect(state.geometry).toEqual(DEFAULT_CHAT_SETTINGS.geometry)
    expect(state.presets.map(preset => preset.id)).toEqual(['standard', 'transparent', 'simple', 'dark', 'readable', 'compact', 'neon'])
  })

  it('commits normalized profiles and geometry', () => {
    const store = createStore()
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    store.set(commitProfileAtom, {
      ...DEFAULT_CHAT_SETTINGS.profile,
      appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 100 },
    })
    store.set(commitGeometryAtom, {
      reference: 'player',
      rect: { x: 0.1, y: 0.2, width: 0.8, height: 1 },
      pinned: true,
    })
    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(40)
    expect(store.get(chatSettingsStateAtom).geometry).toMatchObject({ reference: 'player', pinned: true })
    expect(store.get(chatSettingsStateAtom).geometry).toHaveProperty('rect.x', 0.1)
    expect(store.get(chatSettingsStateAtom).geometry).toHaveProperty('rect.width', 0.65)
    expect(store.get(chatSettingsStateAtom).geometry).toHaveProperty('rect.height', 0.9)
    expect(store.get(chatSettingsStateAtom).geometry).toHaveProperty('rect.y', expect.closeTo(0.1))
  })

  it('keeps normalized defaults and supports preset lifecycle commands', () => {
    const store = createStore()
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(addPresetAtom, { kind: 'custom', id: 'custom', name: 'Custom', profile })
    store.set(updatePresetNameAtom, { id: 'custom', name: 'Renamed' })
    store.set(reorderPresetsAtom, ['custom', 'standard'])
    expect(store.get(chatSettingsStateAtom).presets[0]).toMatchObject({ kind: 'custom', id: 'custom', name: 'Renamed' })
    store.set(deletePresetAtom, 'custom')
    expect(store.get(chatSettingsStateAtom).presets.some(preset => preset.id === 'custom')).toBe(false)
  })

  it('does not delete or rename built-in presets', () => {
    const store = createStore()
    store.set(chatSettingsStateAtom, DEFAULT_CHAT_SETTINGS)
    store.set(updatePresetNameAtom, { id: 'standard', name: 'Renamed' })
    store.set(deletePresetAtom, 'standard')
    expect(store.get(chatSettingsStateAtom).presets[0]).toEqual({ kind: 'builtin', id: 'standard' })
  })

  it('migrates legacy v6 settings into normalized v7 state', () => {
    const state = migrateSettings({
      fontSize: 21,
      coordinates: { x: 80, y: 90 },
      size: { width: 600, height: 500 },
      presetItemIds: ['custom'],
      presetItemTitles: { custom: 'Legacy' },
      presetItemStyles: { custom: { fontSize: 18 } },
    })
    expect(state.profile.appearance.fontSize).toBe(21)
    expect(state.geometry).toMatchObject({
      reference: 'legacy-viewport-px',
      coordinates: { x: 80, y: 90 },
    })
    expect(state.presets).toMatchObject([{ kind: 'custom', id: 'custom', name: 'Legacy' }])
    expect(state).not.toHaveProperty('fontSize')
  })
})
