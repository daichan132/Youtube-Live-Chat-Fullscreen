import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const changeLanguage = vi.hoisted(() => vi.fn())

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      changeLanguage,
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}))

const emitMessage = (message: unknown) => {
  const runtime = (chrome as unknown as { runtime: { __emitMessage: (value: unknown) => void } }).runtime
  runtime.__emitMessage(message)
}

describe('useContentRuntimeMessages', () => {
  beforeEach(() => {
    changeLanguage.mockClear()
    vi.resetModules()
  })

  it('syncs language because it is not part of persisted settings', async () => {
    const { useContentRuntimeMessages } = await import('./useContentRuntimeMessages')
    renderHook(() => useContentRuntimeMessages())

    act(() => {
      emitMessage({ message: 'language', language: 'pt-BR' })
    })

    expect(changeLanguage).toHaveBeenCalledWith('pt_BR')
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

    expect(changeLanguage).not.toHaveBeenCalled()
  })
})
