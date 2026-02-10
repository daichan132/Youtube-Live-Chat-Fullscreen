import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'
import { useYLCBlurChange } from './useYLCBlurChange'

const initialState = useYTDLiveChatNoLsStore.getState()

const createConnectedIframe = () => {
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

  return { iframe }
}

beforeEach(() => {
  useYTDLiveChatNoLsStore.setState({ ...initialState }, true)
})

describe('useYLCBlurChange', () => {
  it('applies backdrop blur styles to iframe body', () => {
    const { iframe } = createConnectedIframe()
    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })
    const { result } = renderHook(() => useYLCBlurChange())

    act(() => {
      result.current.changeBlur(12)
    })

    const body = iframe.contentDocument?.body as HTMLBodyElement
    expect(body.style.backdropFilter).toBe('blur(12px)')
    expect(iframe.style.filter).toBe('none')
  })

  it('no-ops when iframe is missing', () => {
    const { result } = renderHook(() => useYLCBlurChange())

    expect(() => {
      result.current.changeBlur(8)
    }).not.toThrow()
  })

  it('uses the latest iframe even when the callback was captured before attachment', () => {
    const { result } = renderHook(() => useYLCBlurChange())
    const staleChangeBlur = result.current.changeBlur
    const { iframe } = createConnectedIframe()

    useYTDLiveChatNoLsStore.setState({ iframeElement: iframe })

    act(() => {
      staleChangeBlur(9)
    })

    const body = iframe.contentDocument?.body as HTMLBodyElement
    expect(body.style.backdropFilter).toBe('blur(9px)')
    expect(iframe.style.filter).toBe('none')
  })
})
