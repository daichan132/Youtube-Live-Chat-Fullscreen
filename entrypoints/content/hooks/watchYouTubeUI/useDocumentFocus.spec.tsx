import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDocumentFocus } from './useDocumentFocus'

const setHasFocus = (value: boolean) => {
  Object.defineProperty(document, 'hasFocus', {
    value: () => value,
    configurable: true,
  })
}

describe('useDocumentFocus', () => {
  beforeEach(() => {
    setHasFocus(true)
  })

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
