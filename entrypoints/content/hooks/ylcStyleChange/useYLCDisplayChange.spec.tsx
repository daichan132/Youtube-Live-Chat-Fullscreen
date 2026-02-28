import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCDisplayChange } from './useYLCDisplayChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCDisplayChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('toggles using default inline/none values', () => {
    const { result } = renderHook(() => useYLCDisplayChange('--extension-user-name-display'))

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-user-name-display', 'inline')
    expect(setProperty).toHaveBeenCalledWith('--extension-user-name-display', 'none')
  })

  it('uses custom visibleValue when specified', () => {
    const { result } = renderHook(() => useYLCDisplayChange('--extension-super-chat-bar-display', 'block'))

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-super-chat-bar-display', 'block')
    expect(setProperty).toHaveBeenCalledWith('--extension-super-chat-bar-display', 'none')
  })
})
