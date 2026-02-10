import { localStorage } from 'redux-persist-webextension-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ThemeMode } from '@/shared/theme'

interface globalSettingStoreState {
  ytdLiveChat: boolean
  themeMode: ThemeMode
  setYTDLiveChat: (ytdLiveChat: boolean) => void
  setThemeMode: (themeMode: ThemeMode) => void
}

type PersistedGlobalSettingStoreState = Partial<Pick<globalSettingStoreState, 'themeMode' | 'ytdLiveChat'>>

const migratePersistedState = (persistedState: unknown): PersistedGlobalSettingStoreState => {
  if (!persistedState || typeof persistedState !== 'object') {
    return { themeMode: 'light' }
  }

  const state = persistedState as PersistedGlobalSettingStoreState

  if (state.themeMode === 'light' || state.themeMode === 'dark' || state.themeMode === 'system') {
    return state
  }

  return {
    ...state,
    themeMode: 'light',
  }
}

export const useGlobalSettingStore = create<globalSettingStoreState>()(
  persist(
    set => ({
      ytdLiveChat: true,
      themeMode: 'system',
      setYTDLiveChat: ytdLiveChat => set(() => ({ ytdLiveChat })),
      setThemeMode: themeMode => set(() => ({ themeMode })),
    }),
    {
      name: 'globalSettingStore',
      version: 1,
      migrate: persistedState => migratePersistedState(persistedState),
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

export default useGlobalSettingStore
