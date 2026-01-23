import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { useYLCStylePropertyChange } from './useYLCStylePropertyChange'

const initialState = useYTDLiveChatNoLsStore.getState()

beforeEach(() => {
  useYTDLiveChatNoLsStore.setState({ ...initialState }, true)
})

describe('useYLCStylePropertyChange', () => {
  it('sets a single CSS property on the iframe document element', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { result } = renderHook(() => useYLCStylePropertyChange())

    act(() => {
      result.current.setProperty('--test-color', 'red')
    })

    expect(doc.documentElement.style.getPropertyValue('--test-color')).toBe('red')
  })

  it('sets multiple CSS properties at once', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { result } = renderHook(() => useYLCStylePropertyChange())

    act(() => {
      result.current.setProperties({
        '--primary': 'blue',
        '--secondary': 'green',
      })
    })

    expect(doc.documentElement.style.getPropertyValue('--primary')).toBe('blue')
    expect(doc.documentElement.style.getPropertyValue('--secondary')).toBe('green')
  })

  it('no-ops when iframe is missing', () => {
    const { result } = renderHook(() => useYLCStylePropertyChange())

    expect(() => {
      result.current.setProperty('--missing', 'value')
      result.current.setProperties({ '--missing2': 'value2' })
    }).not.toThrow()
  })
})
