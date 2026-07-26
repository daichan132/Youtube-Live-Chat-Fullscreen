import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useChatSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('initializes one v7 settings model', async () => {
    const { useChatSettingsStore } = await import('./chatSettingsStore')
    const state = useChatSettingsStore.getState()

    expect(state.profile).toEqual(DEFAULT_CHAT_SETTINGS.profile)
    expect(state.geometry).toEqual(DEFAULT_CHAT_SETTINGS.geometry)
    expect(state.presets.map(preset => preset.id)).toEqual(['standard', 'transparent', 'simple', 'dark', 'readable', 'compact', 'neon'])
    expect(state).not.toHaveProperty('presetItemIds')
    expect(state).not.toHaveProperty('addPresetEnabled')
  })

  it('commits normalized profiles and geometry', async () => {
    const { useChatSettingsStore } = await import('./chatSettingsStore')
    const state = useChatSettingsStore.getState()
    state.commitProfile({
      ...state.profile,
      appearance: {
        ...state.profile.appearance,
        fontSize: 100,
      },
    })
    state.commitGeometry({
      coordinates: { x: 48, y: 64 },
      size: { width: 100, height: 100 },
    })

    expect(useChatSettingsStore.getState().profile.appearance.fontSize).toBe(40)
    expect(useChatSettingsStore.getState().geometry).toEqual({
      coordinates: { x: 48, y: 64 },
      size: { width: 300, height: 200 },
    })
  })

  it('adds, renames, reorders, and removes custom presets', async () => {
    const { useChatSettingsStore } = await import('./chatSettingsStore')
    const state = useChatSettingsStore.getState()
    state.addPreset({
      kind: 'custom',
      id: 'custom',
      name: 'Custom',
      profile: state.profile,
    })
    state.updatePresetName('custom', '配信用')
    state.reorderPresets(['custom', 'standard'])

    expect(useChatSettingsStore.getState().presets[0]).toMatchObject({
      kind: 'custom',
      id: 'custom',
      name: '配信用',
    })

    state.deletePreset('custom')
    expect(useChatSettingsStore.getState().presets.some(preset => preset.id === 'custom')).toBe(false)
  })

  it('does not delete or rename built-in presets', async () => {
    const { useChatSettingsStore } = await import('./chatSettingsStore')
    const state = useChatSettingsStore.getState()
    state.updatePresetName('standard', 'Renamed')
    state.deletePreset('standard')

    expect(useChatSettingsStore.getState().presets[0]).toEqual({ kind: 'builtin', id: 'standard' })
  })

  it('migrates the persisted v6 state during hydration', async () => {
    localStorage.setItem(
      'ytdLiveChatStore',
      JSON.stringify({
        state: {
          fontSize: 21,
          coordinates: { x: 80, y: 90 },
          size: { width: 600, height: 500 },
          presetItemIds: ['custom'],
          presetItemTitles: { custom: 'Legacy' },
          presetItemStyles: { custom: { fontSize: 18 } },
        },
        version: 6,
      }),
    )

    const { useChatSettingsStore } = await import('./chatSettingsStore')
    const state = useChatSettingsStore.getState()

    expect(state.profile.appearance.fontSize).toBe(21)
    expect(state.geometry.coordinates).toEqual({ x: 80, y: 90 })
    expect(state.presets).toMatchObject([{ kind: 'custom', id: 'custom', name: 'Legacy' }])
    expect(state).not.toHaveProperty('fontSize')
  })
})
