import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYLCUserNameDisplayChange } from './useYLCUserNameDisplayChange'

const setProperty = vi.fn()

vi.mock('./useYLCStylePropertyChange', () => ({
  useYLCStylePropertyChange: () => ({ setProperty }),
}))

describe('useYLCUserNameDisplayChange', () => {
  beforeEach(() => {
    setProperty.mockClear()
  })

  it('toggles the user name display property', () => {
    const { result } = renderHook(() => useYLCUserNameDisplayChange())

    act(() => {
      result.current.changeDisplay(true)
      result.current.changeDisplay(false)
    })

    expect(setProperty).toHaveBeenCalledWith('--extension-user-name-display', 'inline')
    expect(setProperty).toHaveBeenCalledWith('--extension-user-name-display', 'none')
  })
})
