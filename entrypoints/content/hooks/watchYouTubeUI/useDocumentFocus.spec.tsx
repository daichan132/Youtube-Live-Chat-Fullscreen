import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentFocus } from './useDocumentFocus'

const setHasFocus = (value: boolean) => {
  vi.spyOn(document, 'hasFocus').mockReturnValue(value)
}

describe('useDocumentFocus', () => {
  beforeEach(() => {
    setHasFocus(true)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('tracks window focus, blur, and document visibility changes', () => {
    const { result } = renderHook(() => useDocumentFocus())
    expect(result.current).toBe(true)

    setHasFocus(false)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(result.current).toBe(false)

    setHasFocus(true)
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBe(true)

    setHasFocus(false)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(false)

    setHasFocus(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(true)
  })

  it('resamples focus after an iframe blur settles without another window focus event', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useDocumentFocus())
    setHasFocus(false)
    act(() => window.dispatchEvent(new Event('blur')))
    expect(result.current).toBe(false)

    // Firefox can finish transferring focus into its child frame after the
    // parent blur callback, without sending another parent-window focus event.
    setHasFocus(true)
    act(() => vi.advanceTimersToNextFrame())

    expect(result.current).toBe(true)
    unmount()
  })

  it('keeps a real window blur unfocused after resampling and does not poll', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useDocumentFocus())
    setHasFocus(false)
    act(() => window.dispatchEvent(new Event('blur')))
    act(() => vi.advanceTimersToNextFrame())
    expect(result.current).toBe(false)
    const read = vi.mocked(document.hasFocus)
    read.mockClear()

    act(() => vi.advanceTimersByTime(10000))

    expect(result.current).toBe(false)
    expect(read).not.toHaveBeenCalled()
    unmount()
  })

  it('coalesces event bursts into one follow-up focus sample', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useDocumentFocus())
    const read = vi.mocked(document.hasFocus)
    read.mockClear()
    act(() => {
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('blur'))
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(read).toHaveBeenCalledTimes(3)
    read.mockClear()

    act(() => vi.advanceTimersToNextFrame())
    expect(read).toHaveBeenCalledOnce()
    read.mockClear()
    act(() => vi.advanceTimersToNextFrame())
    expect(read).not.toHaveBeenCalled()
    unmount()
  })

  it('releases the deferred sample and event listeners on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useDocumentFocus())
    setHasFocus(false)
    act(() => window.dispatchEvent(new Event('blur')))
    const read = vi.mocked(document.hasFocus)
    read.mockClear()

    unmount()
    act(() => {
      vi.advanceTimersToNextFrame()
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(read).not.toHaveBeenCalled()
  })
})
