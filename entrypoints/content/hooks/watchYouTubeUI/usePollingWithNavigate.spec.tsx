import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePollingWithNavigate } from './usePollingWithNavigate'

describe('usePollingWithNavigate', () => {
  it('keeps success latched across yt-navigate-finish when stopOnSuccess is true', () => {
    const checkFn = vi.fn(() => true)

    const { result } = renderHook(() =>
      usePollingWithNavigate({
        checkFn,
        intervalMs: 100000,
      }),
    )

    expect(result.current).toBe(true)
    expect(checkFn).toHaveBeenCalledTimes(1)

    act(() => {
      document.dispatchEvent(new Event('yt-navigate-finish'))
    })

    expect(result.current).toBe(true)
    expect(checkFn).toHaveBeenCalledTimes(1)
  })

  it('re-checks on yt-navigate-finish before latching success', () => {
    const checkFn = vi.fn(() => false)

    const { result } = renderHook(() =>
      usePollingWithNavigate({
        checkFn,
        intervalMs: 100000,
      }),
    )

    expect(result.current).toBe(false)
    expect(checkFn).toHaveBeenCalledTimes(1)

    act(() => {
      document.dispatchEvent(new Event('yt-navigate-finish'))
    })

    expect(result.current).toBe(false)
    expect(checkFn).toHaveBeenCalledTimes(2)
  })
})
