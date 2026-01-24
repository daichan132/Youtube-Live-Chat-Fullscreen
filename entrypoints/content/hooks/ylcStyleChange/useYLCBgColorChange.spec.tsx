import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCBgColorChange } from './useYLCBgColorChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCBgColorChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('applies background, darkened, and transparent properties', () => {
    const { result } = renderHook(() => useYLCBgColorChange())

    act(() => {
      result.current.changeColor({ r: 100, g: 120, b: 140, a: 0.8 })
    })

    expect(setProperty).toHaveBeenCalledWith('--yt-live-chat-background-color', 'rgba(100, 120, 140, 0.8)')
    expect(setProperty).toHaveBeenCalledWith('--yt-spec-icon-disabled', 'rgba(60, 80, 100, 0.8)')
    expect(setProperty).toHaveBeenCalledWith('--yt-live-chat-vem-background-color', 'rgba(80, 100, 120, 0.8)')
    expect(setProperty).toHaveBeenCalledWith('--yt-live-chat-header-background-color', 'transparent')
    expect(setProperty).toHaveBeenCalledWith('--yt-spec-general-background-b', 'transparent')

    expect(setProperty).toHaveBeenCalledTimes(9)
  })
})
