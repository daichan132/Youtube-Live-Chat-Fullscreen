import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setLocale = vi.hoisted(() => vi.fn())

vi.mock('@/shared/runtime/AppProvider', () => ({
  useAppRuntime: () => ({ setLocale }),
}))

const emitMessage = (message: unknown) => {
  const runtime = (chrome as unknown as { runtime: { __emitMessage: (value: unknown) => void } }).runtime
  runtime.__emitMessage(message)
}

describe('useContentRuntimeMessages', () => {
  beforeEach(() => {
    setLocale.mockClear()
    vi.resetModules()
  })

  it('syncs language because it is not part of persisted settings', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    renderHook(() => useContentRuntimeMessages())

    act(() => {
      emitMessage({ message: 'language', language: 'pt-BR' })
    })

    expect(setLocale).toHaveBeenCalledWith('pt_BR')
  })

  it('ignores settings messages handled through storage and invalid language payloads', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    renderHook(() => useContentRuntimeMessages())

    act(() => {
      emitMessage({ message: 'themeMode', themeMode: 'dark' })
      emitMessage({ message: 'ytdLiveChat', ytdLiveChat: false })
      emitMessage({ message: 'settingsImported' })
      emitMessage({ message: 'language', language: 123 })
      emitMessage(null)
    })

    expect(setLocale).not.toHaveBeenCalled()
  })
})
