import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCUserIconDisplayChange } from './useYLCUserIconDisplayChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCUserIconDisplayChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('toggles the user icon display property', () => {
    const { result } = renderHook(() => useYLCUserIconDisplayChange())

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-user-icon-display', 'inline')
    expect(setProperty).toHaveBeenCalledWith('--extension-user-icon-display', 'none')
  })
})
