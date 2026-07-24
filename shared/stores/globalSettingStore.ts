import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { normalizeGlobalSetting } from '@/shared/settings/normalizeSettings'
import { GLOBAL_SETTING_PERSIST } from '@/shared/settings/persistConfig'
import type { ThemeMode } from '@/shared/theme'

interface GlobalSettingStoreState {
  ytdLiveChat: boolean
  themeMode: ThemeMode
  setYTDLiveChat: (ytdLiveChat: boolean) => void
  setThemeMode: (themeMode: ThemeMode) => void
}

type PersistedGlobalSettingStoreState = Partial<Pick<GlobalSettingStoreState, 'themeMode' | 'ytdLiveChat'>>

const migratePersistedState = (persistedState: unknown): PersistedGlobalSettingStoreState => {
  if (!persistedState || typeof persistedState !== 'object') {
    return { themeMode: 'light' }
  }

  const normalized = normalizeGlobalSetting(persistedState)
  return {
    ...normalized,
    themeMode: normalized.themeMode ?? 'light',
  }
}

export const useGlobalSettingStore = create<GlobalSettingStoreState>()(
  persist(
    set => ({
      ytdLiveChat: true,
      themeMode: 'system',
      setYTDLiveChat: ytdLiveChat => set(() => ({ ytdLiveChat })),
      setThemeMode: themeMode => set(() => ({ themeMode })),
    }),
    {
      name: GLOBAL_SETTING_PERSIST.key,
      version: GLOBAL_SETTING_PERSIST.version,
      migrate: persistedState => migratePersistedState(persistedState),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
