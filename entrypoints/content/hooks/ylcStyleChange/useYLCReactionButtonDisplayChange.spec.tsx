import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCReactionButtonDisplayChange } from './useYLCReactionButtonDisplayChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCReactionButtonDisplayChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('toggles the reaction button display property', () => {
    const { result } = renderHook(() => useYLCReactionButtonDisplayChange())

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-reaction-button-display', 'inline')
    expect(setProperty).toHaveBeenCalledWith('--extension-reaction-button-display', 'none')
  })
})
