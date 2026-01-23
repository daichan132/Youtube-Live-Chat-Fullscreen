import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCSpaceChange } from './useYLCSpaceChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCSpaceChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('sets the chat spacing in pixels', () => {
    const { result } = renderHook(() => useYLCSpaceChange())

    act(() => {
      result.current.changeSpace(12)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-yt-live-chat-spacing', '12px')
  })
})
