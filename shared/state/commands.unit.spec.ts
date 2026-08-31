import { createStore } from 'jotai/vanilla'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from '@/shared/settings/migrateSettings'
import { MAX_CUSTOM_PRESETS } from '@/shared/settings/persistConfig'
import { chatSettingsStateAtom, editorSessionStateAtom } from './atoms'
import {
  addPresetAtom,
  cancelStyleGestureAtom,
  commitGeometryAtom,
  deletePresetAtom,
  reorderPresetsAtom,
  resetGeometryAtom,
  updatePresetNameAtom,
} from './commands'

const store = createStore()

const resetStore = () => {
  store.set(chatSettingsStateAtom, structuredClone(DEFAULT_CHAT_SETTINGS))
  store.set(editorSessionStateAtom, { draftProfile: null, past: [], future: [], activeGesture: null })
}

describe('state commands', () => {
  beforeEach(resetStore)

  it('keeps the same chat state object for no-op commands', () => {
    const initial = store.get(chatSettingsStateAtom)
    const ids = initial.presets.map(preset => preset.id)

    expect(store.set(deletePresetAtom, 'missing')).toBe(false)
    expect(store.set(reorderPresetsAtom, ids)).toBe(false)
    expect(store.set(updatePresetNameAtom, { id: 'missing', name: 'Missing' })).toBe(false)
    expect(store.set(resetGeometryAtom)).toBe(false)
    expect(store.set(commitGeometryAtom, initial.geometry)).toBe(false)
    expect(store.get(chatSettingsStateAtom)).toBe(initial)
  })

  it('rejects custom presets after the shared maximum is reached', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    const customPresets = Array.from({ length: MAX_CUSTOM_PRESETS }, (_, index) => ({
      kind: 'custom' as const,
      id: `custom-${index}`,
      name: `Custom ${index}`,
      profile,
    }))
    store.set(chatSettingsStateAtom, { ...store.get(chatSettingsStateAtom), presets: customPresets })
    const before = store.get(chatSettingsStateAtom)

    expect(
      store.set(addPresetAtom, {
        kind: 'custom',
        id: 'over-limit',
        name: 'Over limit',
        profile,
      }),
    ).toBe(false)
    expect(store.get(chatSettingsStateAtom)).toBe(before)
  })

  it('updates a custom preset name once and skips the same value', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    store.set(chatSettingsStateAtom, {
      ...store.get(chatSettingsStateAtom),
      presets: [{ kind: 'custom', id: 'custom', name: 'Before', profile }],
    })

    expect(store.set(updatePresetNameAtom, { id: 'custom', name: 'After' })).toBe(true)
    const after = store.get(chatSettingsStateAtom)
    expect(after.presets[0]).toMatchObject({ name: 'After' })
    expect(store.set(updatePresetNameAtom, { id: 'custom', name: 'After' })).toBe(false)
    expect(store.get(chatSettingsStateAtom)).toBe(after)
  })

  it('cancels only the active gesture while preserving committed undo and redo history', () => {
    const profile = store.get(chatSettingsStateAtom).profile
    const pastProfile = {
      ...profile,
      appearance: { ...profile.appearance, fontSize: profile.appearance.fontSize + 1 },
    }
    const futureProfile = {
      ...profile,
      appearance: { ...profile.appearance, fontSize: profile.appearance.fontSize + 2 },
    }
    store.set(editorSessionStateAtom, {
      draftProfile: futureProfile,
      past: [pastProfile],
      future: [futureProfile],
      activeGesture: { id: 'font-size', before: profile },
    })

    expect(store.set(cancelStyleGestureAtom)).toBe(true)
    expect(store.get(editorSessionStateAtom)).toEqual({
      draftProfile: null,
      past: [pastProfile],
      future: [futureProfile],
      activeGesture: null,
    })
    expect(store.set(cancelStyleGestureAtom)).toBe(false)
  })
})
