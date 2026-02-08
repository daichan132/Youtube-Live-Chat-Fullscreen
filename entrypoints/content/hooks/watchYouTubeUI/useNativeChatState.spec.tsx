import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isNativeChatExpanded, isNativeChatUsable } from '@/entrypoints/content/utils/nativeChatState'
import { useNativeChatState } from './useNativeChatState'

vi.mock('@/entrypoints/content/utils/nativeChatState', () => ({
  isNativeChatExpanded: vi.fn(),
  isNativeChatUsable: vi.fn(),
}))

const isNativeChatExpandedMock = vi.mocked(isNativeChatExpanded)
const isNativeChatUsableMock = vi.mocked(isNativeChatUsable)
class ResizeObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe('useNativeChatState', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    isNativeChatExpandedMock.mockReset()
    isNativeChatUsableMock.mockReset()
    isNativeChatExpandedMock.mockReturnValue(false)
    isNativeChatUsableMock.mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps expanded signal in fullscreen while usability is forced false', async () => {
    isNativeChatExpandedMock.mockReturnValue(true)
    isNativeChatUsableMock.mockReturnValue(true)

    const { result } = renderHook(() => useNativeChatState(true))

    await waitFor(() => {
      expect(result.current.isNativeChatExpanded).toBe(true)
      expect(result.current.isNativeChatUsable).toBe(false)
    })

    expect(isNativeChatExpandedMock).toHaveBeenCalled()
    expect(isNativeChatUsableMock).not.toHaveBeenCalled()
  })

  it('uses native usable state when not fullscreen', async () => {
    isNativeChatExpandedMock.mockReturnValue(true)
    isNativeChatUsableMock.mockReturnValue(true)

    const { result } = renderHook(() => useNativeChatState(false))

    await waitFor(() => {
      expect(result.current.isNativeChatExpanded).toBe(true)
      expect(result.current.isNativeChatUsable).toBe(true)
    })
  })
})
