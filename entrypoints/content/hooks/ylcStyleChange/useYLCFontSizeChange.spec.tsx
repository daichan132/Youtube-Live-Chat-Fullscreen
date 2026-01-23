import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCFontSizeChange } from './useYLCFontSizeChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCFontSizeChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('sets the chat font size in pixels', () => {
    const { result } = renderHook(() => useYLCFontSizeChange())

    act(() => {
      result.current.changeFontSize(18)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-yt-live-chat-font-size', '18px')
  })
})
