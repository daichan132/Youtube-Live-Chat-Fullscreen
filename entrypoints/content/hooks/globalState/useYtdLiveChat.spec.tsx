import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useYtdLiveChat', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('updates the global setting when a runtime message arrives', async () => {
    const { useYtdLiveChat } = await import('./useYtdLiveChat')
    const { useGlobalSettingStore } = await import('@/shared/stores')

    const { result } = renderHook(() => useYtdLiveChat())

    expect(result.current[0]).toBe(true)

    const runtime = (chrome as unknown as { runtime: { __emitMessage: (message: unknown) => void } }).runtime

    act(() => {
      runtime.__emitMessage({ message: 'ytdLiveChat', ytdLiveChat: false })
    })

    expect(useGlobalSettingStore.getState().ytdLiveChat).toBe(false)
    expect(result.current[0]).toBe(false)
  })
})
