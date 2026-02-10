import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useGlobalSettingStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults ytdLiveChat to true and themeMode to system', async () => {
    const { useGlobalSettingStore } = await import('./globalSettingStore')

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)
    expect(useGlobalSettingStore.getState().themeMode).toBe('system')
  })

  it('updates ytdLiveChat and themeMode via setters', async () => {
    const { useGlobalSettingStore } = await import('./globalSettingStore')

    useGlobalSettingStore.getState().setYTDLiveChat(false)
    useGlobalSettingStore.getState().setThemeMode('dark')

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(useGlobalSettingStore.getState().themeMode).toBe('dark')
  })

  it('migrates persisted state from v0 and fills themeMode as light', async () => {
    localStorage.setItem(
      'globalSettingStore',
      JSON.stringify({
        state: {
          ytdLiveChat: false,
        },
        version: 0,
      }),
    )

    const { useGlobalSettingStore } = await import('./globalSettingStore')

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(useGlobalSettingStore.getState().themeMode).toBe('light')
  })
})
