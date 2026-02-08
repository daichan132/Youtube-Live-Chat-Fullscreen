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
    Object.defineProperty(iframe, 'isConnected', {
      value: true,
      configurable: true,
    })

    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { result } = renderHook(() => useYLCStylePropertyChange())

    act(() => {
      result.current.setProperty('--test-color', 'red')
    })

    expect(doc.documentElement.style.getPropertyValue('--test-color')).toBe('red')
  })

  it('sets multiple CSS properties on the iframe document element', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })
    Object.defineProperty(iframe, 'isConnected', {
      value: true,
      configurable: true,
    })

    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    const { result } = renderHook(() => useYLCStylePropertyChange())

    act(() => {
      result.current.setProperties([
        ['--test-size', '12px'],
        ['--test-color', 'blue'],
      ])
    })

    expect(doc.documentElement.style.getPropertyValue('--test-size')).toBe('12px')
    expect(doc.documentElement.style.getPropertyValue('--test-color')).toBe('blue')
  })

  it('no-ops when iframe is missing', () => {
    const { result } = renderHook(() => useYLCStylePropertyChange())

    expect(() => {
      result.current.setProperty('--missing', 'value')
    }).not.toThrow()
  })
})
