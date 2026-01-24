import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useGlobalSettingStore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('defaults ytdLiveChat to true', async () => {
    const { useGlobalSettingStore } = await import('./globalSettingStore')

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(true)
  })

  it('updates ytdLiveChat via setter', async () => {
    const { useGlobalSettingStore } = await import('./globalSettingStore')

    useGlobalSettingStore.getState().setYTDLiveChat(false)

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
  })
})
