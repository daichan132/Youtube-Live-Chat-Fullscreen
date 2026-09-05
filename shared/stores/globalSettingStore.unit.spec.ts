import { createStore } from 'jotai/vanilla'
import { describe, expect, it } from 'vitest'
import { globalSettingsStateAtom } from '@/shared/state/atoms'
import { setThemeModeAtom, setYTDLiveChatEnabledAtom } from '@/shared/state/commands'

describe('global settings commands', () => {
  it('starts with stable defaults', () => {
    const store = createStore()
    store.set(globalSettingsStateAtom, { ytdLiveChat: true, themeMode: 'system' })
    expect(store.get(globalSettingsStateAtom)).toEqual({ ytdLiveChat: true, themeMode: 'system' })
  })

  it('updates global settings through write-only atoms', () => {
    const store = createStore()
    store.set(setYTDLiveChatEnabledAtom, false)
    store.set(setThemeModeAtom, 'dark')
    expect(store.get(globalSettingsStateAtom)).toEqual({ ytdLiveChat: false, themeMode: 'dark' })
  })
})
