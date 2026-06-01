import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePollingWithNavigate } from './usePollingWithNavigate'

describe('usePollingWithNavigate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps polling after success when stopOnSuccess is false', () => {
    const checkFn = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false).mockReturnValueOnce(true)
    const { result } = renderHook(() =>
      usePollingWithNavigate({
        checkFn,
        intervalMs: 2000,
        stopOnSuccess: false,
      }),
    )

    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe(true)
    expect(checkFn).toHaveBeenCalledTimes(3)
  })
})
