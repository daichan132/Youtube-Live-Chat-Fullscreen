import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCFontColorChange } from './useYLCFontColorChange'

const setProperties = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperties }),
}))

describe('useYLCFontColorChange', () => {
  beforeEach(() => {
    setProperties.mockClear()
  })

  it('applies primary and secondary font colors with adjusted alpha', () => {
    const { result } = renderHook(() => useYLCFontColorChange())
    const rgba = { r: 10, g: 20, b: 30, a: 0.6 }
    const secondaryAlpha = Math.max(0, (rgba.a ?? 0) - 0.4)

    act(() => {
      result.current.changeColor(rgba)
    })

    expect(setProperties).toHaveBeenCalledTimes(1)
    const entries = setProperties.mock.calls[0]?.[0] ?? []
    expect(entries).toContainEqual(['--extension-yt-live-font-color', 'rgba(10, 20, 30, 0.6)'])
    expect(entries).toContainEqual(['--extension-yt-live-secondary-font-color', `rgba(10, 20, 30, ${secondaryAlpha})`])
    expect(entries).toHaveLength(2)
  })
})
