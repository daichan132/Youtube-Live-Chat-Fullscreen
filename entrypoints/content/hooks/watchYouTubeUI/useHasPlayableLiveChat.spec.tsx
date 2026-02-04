import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasPlayableLiveChat } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { useHasPlayableLiveChat } from './useHasPlayableLiveChat'

vi.mock('@/entrypoints/content/utils/hasPlayableLiveChat', () => ({
  hasPlayableLiveChat: vi.fn(),
}))

const hasPlayableLiveChatMock = vi.mocked(hasPlayableLiveChat)

describe('useHasPlayableLiveChat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    hasPlayableLiveChatMock.mockReset()
  })

  it('sets state to true once playable chat is detected', () => {
    // First call (immediate check) returns false, second call returns true
    hasPlayableLiveChatMock.mockReturnValueOnce(false).mockReturnValueOnce(true)

    const { result } = renderHook(() => useHasPlayableLiveChat())

    // Immediate check returns false
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // After interval, returns true
    expect(result.current).toBe(true)
  })

  it('continues polling after initial success and reflects later changes', () => {
    hasPlayableLiveChatMock.mockReturnValueOnce(true).mockReturnValueOnce(false)

    const { result } = renderHook(() => useHasPlayableLiveChat())

    // Immediate check returns true - no need to wait
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current).toBe(false)
  })

  it('tracks changes over multiple polling cycles', () => {
    hasPlayableLiveChatMock.mockReturnValueOnce(false).mockReturnValueOnce(true).mockReturnValueOnce(false)

    const { result } = renderHook(() => useHasPlayableLiveChat())

    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current).toBe(false)
  })
})
