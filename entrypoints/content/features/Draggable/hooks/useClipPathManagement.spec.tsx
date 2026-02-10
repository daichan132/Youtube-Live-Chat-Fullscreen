import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useClipPathManagement } from './useClipPathManagement'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

describe('useClipPathManagement', () => {
  it('computes clip sizes from iframe content', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    const header = doc.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40 })

    const input = doc.createElement('yt-live-chat-message-input-renderer')
    Object.defineProperty(input, 'clientHeight', { value: 24 })

    doc.body.appendChild(header)
    doc.body.appendChild(input)

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() => useClipPathManagement({ iframeElement: iframe }))

    expect(result.current.getClip()).toEqual({ header: 32, input: 20 })
  })

  it('clamps clip sizes to zero when clip elements are missing', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() => useClipPathManagement({ iframeElement: iframe }))

    expect(result.current.getClip()).toEqual({ header: 0, input: 0 })
  })

  it('prefers a visible restricted participation area over hidden message input', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    const header = doc.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40 })

    const input = doc.createElement('yt-live-chat-message-input-renderer')
    Object.defineProperty(input, 'clientHeight', { value: 0 })

    const restricted = doc.createElement('yt-live-chat-restricted-participation-renderer')
    Object.defineProperty(restricted, 'clientHeight', { value: 22 })

    doc.body.appendChild(header)
    doc.body.appendChild(input)
    doc.body.appendChild(restricted)

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() => useClipPathManagement({ iframeElement: iframe }))
    expect(result.current.getClip()).toEqual({ header: 32, input: 18 })
  })

  it('uses input panel height as a fallback for sign-in style chat prompts', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')

    const header = doc.createElement('yt-live-chat-header-renderer')
    Object.defineProperty(header, 'clientHeight', { value: 40 })

    const inputPanel = doc.createElement('div')
    inputPanel.id = 'input-panel'
    Object.defineProperty(inputPanel, 'clientHeight', { value: 28 })

    doc.body.appendChild(header)
    doc.body.appendChild(inputPanel)

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() => useClipPathManagement({ iframeElement: iframe }))
    expect(result.current.getClip()).toEqual({ header: 32, input: 24 })
  })

  it('removes focus from iframe active element', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')
    const activeElement = doc.createElement('button')
    const blur = vi.spyOn(activeElement, 'blur')

    Object.defineProperty(doc, 'activeElement', {
      value: activeElement,
      configurable: true,
    })

    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const { result } = renderHook(() => useClipPathManagement({ iframeElement: iframe }))
    result.current.removeFocus()

    expect(blur).toHaveBeenCalledTimes(1)
  })
})
