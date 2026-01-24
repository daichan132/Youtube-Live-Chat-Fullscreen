import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIsFullScreen } from './useIsFullscreen'

describe('useIsFullScreen', () => {
  it('tracks document.fullscreenElement changes', () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })

    const { result } = renderHook(() => useIsFullScreen())

    expect(result.current).toBe(false)

    const fullscreenTarget = document.createElement('div')
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: fullscreenTarget,
    })

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })

    expect(result.current).toBe(true)

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })

    expect(result.current).toBe(false)
  })
})
