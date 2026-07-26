import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_CHAT_GEOMETRY } from './defaults'
import { DEFAULT_CHAT_SETTINGS, migrateSettings } from './migrateSettings'
import type { ChatGeometry, ChatProfile, ChatSettings, PresetEntry } from './model'
import { normalizeChatGeometry, normalizeChatProfile, normalizeChatSettings, normalizePresetEntry } from './normalizeSettings'
import { originAwareLocalStorage } from './originAwareStorage'
import { YTD_LIVE_CHAT_PERSIST } from './persistConfig'

export type ChatSettingsStore = ChatSettings & {
  commitProfile: (profile: ChatProfile) => void
  commitGeometry: (geometry: ChatGeometry) => void
  addPreset: (preset: PresetEntry) => void
  deletePreset: (id: string) => void
  reorderPresets: (ids: string[]) => void
  updatePresetName: (id: string, name: string) => void
  resetGeometry: () => void
}

const createInitialSettings = () => normalizeChatSettings(DEFAULT_CHAT_SETTINGS, DEFAULT_CHAT_SETTINGS)

export const getPersistedChatSettings = (state: ChatSettingsStore): ChatSettings => ({
  profile: normalizeChatProfile(state.profile),
  geometry: normalizeChatGeometry(state.geometry),
  presets: state.presets.map(preset =>
    preset.kind === 'builtin'
      ? { kind: 'builtin', id: preset.id }
      : {
          kind: 'custom',
          id: preset.id,
          name: preset.name,
          profile: normalizeChatProfile(preset.profile),
        },
  ),
})

export const useChatSettingsStore = create<ChatSettingsStore>()(
  persist(
    set => ({
      ...createInitialSettings(),
      commitProfile: profile => set(state => ({ profile: normalizeChatProfile(profile, state.profile) })),
      commitGeometry: geometry => set(state => ({ geometry: normalizeChatGeometry(geometry, state.geometry) })),
      addPreset: preset =>
        set(state => {
          const normalized = normalizePresetEntry(preset)
          if (!normalized || state.presets.some(existing => existing.id === normalized.id)) return state
          return { presets: [...state.presets, normalized] }
        }),
      deletePreset: id =>
        set(state => ({
          presets: state.presets.filter(preset => preset.kind === 'builtin' || preset.id !== id),
        })),
      reorderPresets: ids =>
        set(state => {
          const presetsById = new Map(state.presets.map(preset => [preset.id, preset]))
          const reordered: PresetEntry[] = []
          const seen = new Set<string>()
          for (const id of ids) {
            if (seen.has(id)) continue
            const preset = presetsById.get(id)
            if (!preset) continue
            seen.add(id)
            reordered.push(preset)
          }
          for (const preset of state.presets) {
            if (!seen.has(preset.id)) reordered.push(preset)
          }
          return { presets: reordered }
        }),
      updatePresetName: (id, name) =>
        set(state => ({
          presets: state.presets.map(preset =>
            preset.kind === 'custom' && preset.id === id ? { ...preset, name: name.slice(0, 100) } : preset,
          ),
        })),
      resetGeometry: () => set({ geometry: normalizeChatGeometry(DEFAULT_CHAT_GEOMETRY) }),
    }),
    {
      name: YTD_LIVE_CHAT_PERSIST.key,
      version: YTD_LIVE_CHAT_PERSIST.version,
      migrate: persistedState => migrateSettings(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...migrateSettings(persistedState),
      }),
      partialize: getPersistedChatSettings,
      storage: createJSONStorage(() => originAwareLocalStorage),
    },
  ),
)
