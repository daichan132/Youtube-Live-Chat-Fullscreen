import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDocumentFocus } from './useDocumentFocus'

const setHasFocus = (value: boolean) => {
  vi.spyOn(document, 'hasFocus').mockReturnValue(value)
}

describe('useDocumentFocus', () => {
  beforeEach(() => {
    setHasFocus(true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('tracks window focus, blur, and document visibility changes', () => {
    const { result } = renderHook(() => useDocumentFocus())
    expect(result.current).toBe(true)

    setHasFocus(false)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(result.current).toBe(false)

    setHasFocus(true)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(result.current).toBe(true)
  })
})
