import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClipAnimationPriming } from './useClipAnimationPriming'

describe('useClipAnimationPriming', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns false on first non-zero clip frame and true after timeout tick', () => {
    const { result, rerender } = renderHook(({ isClipPath, clip }) => useClipAnimationPriming({ isClipPath, clip }), {
      initialProps: {
        isClipPath: false,
        clip: { header: 0, input: 0 },
      },
    })

    expect(result.current.isClipAnimationReady).toBe(false)

    rerender({
      isClipPath: true,
      clip: { header: 32, input: 20 },
    })

    expect(result.current.isClipAnimationReady).toBe(false)

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.isClipAnimationReady).toBe(true)
  })

  it('does not prime while clip remains zero', () => {
    const { result } = renderHook(() =>
      useClipAnimationPriming({
        isClipPath: true,
        clip: { header: 0, input: 0 },
      }),
    )

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.isClipAnimationReady).toBe(false)
  })

  it('primes when clip becomes measurable after initial zero clip', () => {
    const { result, rerender } = renderHook(
      ({ clip }) =>
        useClipAnimationPriming({
          isClipPath: true,
          clip,
        }),
      {
        initialProps: {
          clip: { header: 0, input: 0 },
        },
      },
    )

    expect(result.current.isClipAnimationReady).toBe(false)

    rerender({ clip: { header: 12, input: 8 } })
    expect(result.current.isClipAnimationReady).toBe(false)

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(result.current.isClipAnimationReady).toBe(true)
  })

  it('keeps ready state true after priming once', () => {
    const { result, rerender } = renderHook(({ isClipPath, clip }) => useClipAnimationPriming({ isClipPath, clip }), {
      initialProps: {
        isClipPath: true,
        clip: { header: 12, input: 8 },
      },
    })

    act(() => {
      vi.runOnlyPendingTimers()
    })
    expect(result.current.isClipAnimationReady).toBe(true)

    rerender({
      isClipPath: false,
      clip: { header: 0, input: 0 },
    })
    expect(result.current.isClipAnimationReady).toBe(true)
  })

  it('cleans up timeout when unmounted before priming tick', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    const { unmount } = renderHook(() =>
      useClipAnimationPriming({
        isClipPath: true,
        clip: { header: 24, input: 16 },
      }),
    )

    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
