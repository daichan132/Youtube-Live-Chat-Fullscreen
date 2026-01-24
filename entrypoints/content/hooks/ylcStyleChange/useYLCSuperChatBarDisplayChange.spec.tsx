import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCSuperChatBarDisplayChange } from './useYLCSuperChatBarDisplayChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCSuperChatBarDisplayChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('toggles the super chat bar display property', () => {
    const { result } = renderHook(() => useYLCSuperChatBarDisplayChange())

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-super-chat-bar-display', 'block')
    expect(setProperty).toHaveBeenCalledWith('--extension-super-chat-bar-display', 'none')
  })
})
