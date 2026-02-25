import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdle } from '@/shared/hooks/useIdle'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { DisplayEffect } from './DisplayEffect'

vi.mock('@/shared/hooks/useIdle', () => ({
  useIdle: vi.fn(),
}))

const baseState = useYTDLiveChatNoLsStore.getState()

const resetStore = (overrides: Partial<typeof baseState> = {}) => {
  useYTDLiveChatNoLsStore.setState(
    {
      ...baseState,
      ...overrides,
      clip: { ...baseState.clip },
    },
    true,
  )
}

const setHasFocus = (value: boolean) => {
  Object.defineProperty(document, 'hasFocus', {
    value: () => value,
    configurable: true,
  })
}

describe('DisplayEffect', () => {
  beforeEach(() => {
    resetStore()
    const useIdleMock = useIdle as unknown as ReturnType<typeof vi.fn>
    useIdleMock.mockReset()
  })

  it('hides the chat when idle, not hovering, focused, and settings are closed', async () => {
    const useIdleMock = useIdle as unknown as ReturnType<typeof vi.fn>
    useIdleMock.mockReturnValue(true)
    setHasFocus(true)

    render(<DisplayEffect />)

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(false)
    })
  })

  it('keeps the chat visible when hovering even if idle', async () => {
    const useIdleMock = useIdle as unknown as ReturnType<typeof vi.fn>
    useIdleMock.mockReturnValue(true)
    setHasFocus(true)
    resetStore({ isHover: true, isDisplay: false })

    render(<DisplayEffect />)

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    })
  })

  it('keeps the chat visible when the document is unfocused', async () => {
    const useIdleMock = useIdle as unknown as ReturnType<typeof vi.fn>
    useIdleMock.mockReturnValue(true)
    setHasFocus(false)
    resetStore({ isDisplay: false })

    render(<DisplayEffect />)

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().isDisplay).toBe(true)
    })
  })
})
