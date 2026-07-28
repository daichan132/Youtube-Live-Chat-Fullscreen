import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

const setLocale = vi.hoisted(() => vi.fn())

vi.mock('@/shared/runtime/AppProvider', () => ({
  useAppRuntime: () => ({ setLocale }),
}))

describe('useContentRuntimeMessages', () => {
  beforeEach(() => {
    setLocale.mockClear()
    vi.resetModules()
  })

  it('syncs language because it is not part of persisted settings', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    renderHook(() => useContentRuntimeMessages())

    await act(async () => {
      await fakeBrowser.runtime.onMessage.trigger({ message: 'language', language: 'pt-BR' }, {})
    })

    expect(setLocale).toHaveBeenCalledWith('pt_BR')
  })

  it('ignores settings messages handled through storage and invalid language payloads', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    renderHook(() => useContentRuntimeMessages())

    await act(async () => {
      await fakeBrowser.runtime.onMessage.trigger({ message: 'themeMode', themeMode: 'dark' }, {})
      await fakeBrowser.runtime.onMessage.trigger({ message: 'ytdLiveChat', ytdLiveChat: false }, {})
      await fakeBrowser.runtime.onMessage.trigger({ message: 'settingsImported' }, {})
      await fakeBrowser.runtime.onMessage.trigger({ message: 'language', language: 123 }, {})
      await fakeBrowser.runtime.onMessage.trigger(null, {})
    })

    expect(setLocale).not.toHaveBeenCalled()
  })
})
