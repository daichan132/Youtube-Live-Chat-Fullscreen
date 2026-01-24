import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCFontColorChange } from './useYLCFontColorChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCFontColorChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('applies primary and secondary font colors with adjusted alpha', () => {
    const { result } = renderHook(() => useYLCFontColorChange())
    const rgba = { r: 10, g: 20, b: 30, a: 0.6 }
    const secondaryAlpha = Math.max(0, (rgba.a ?? 0) - 0.4)

    act(() => {
      result.current.changeColor(rgba)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-yt-live-font-color', 'rgba(10, 20, 30, 0.6)')
    expect(setProperty).toHaveBeenCalledWith('--extension-yt-live-secondary-font-color', `rgba(10, 20, 30, ${secondaryAlpha})`)
    expect(setProperty).toHaveBeenCalledTimes(2)
  })
})
