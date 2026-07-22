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

  it('does not start polling when a terminal stop condition is already met', () => {
    const checkFn = vi.fn(() => true)
    const stopWhen = vi.fn(() => true)
    const { result } = renderHook(() =>
      usePollingWithNavigate({
        checkFn,
        intervalMs: 1000,
        stopWhen,
      }),
    )

    expect(result.current).toBe(false)
    expect(checkFn).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(checkFn).not.toHaveBeenCalled()
  })

  it('stops polling when a terminal condition becomes true', () => {
    let terminal = false
    const checkFn = vi.fn(() => false)
    const { result } = renderHook(() =>
      usePollingWithNavigate({
        checkFn,
        intervalMs: 1000,
        stopWhen: () => terminal,
      }),
    )

    expect(checkFn).toHaveBeenCalledTimes(1)
    terminal = true

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
    expect(checkFn).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(checkFn).toHaveBeenCalledTimes(1)
  })
})
