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
    hasPlayableLiveChatMock.mockReturnValueOnce(true)

    const { result } = renderHook(() => useHasPlayableLiveChat())

    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(true)
  })

  it('remains false when playable chat is never detected', () => {
    hasPlayableLiveChatMock.mockReturnValue(false)

    const { result } = renderHook(() => useHasPlayableLiveChat())

    act(() => {
      vi.advanceTimersByTime(101000)
    })

    expect(result.current).toBe(false)
  })
})
