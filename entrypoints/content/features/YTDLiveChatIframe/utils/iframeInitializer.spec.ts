import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IframeLoadState } from './chatSourceResolver'
import { createIframeInitializer } from './iframeInitializer'

const createChatDoc = () => document.implementation.createHTMLDocument('chat') as Document

describe('iframeInitializer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('injects style and marks loaded when document is accessible', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    const doc = createChatDoc()
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const applyChatStyle = vi.fn()
    const setIsIframeLoaded = vi.fn()
    const setIsDisplay = vi.fn()
    const setLoadState = vi.fn<(state: IframeLoadState) => void>()
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded,
      setIsDisplay,
      setLoadState,
    })

    const initialized = initializer.initialize(iframe)
    expect(initialized).toBe(true)
    expect(doc.head?.querySelector('style[data-ylc-style-injected="true"]')).not.toBeNull()
    expect(doc.body.classList.contains('custom-yt-app-live-chat-extension')).toBe(true)
    expect(applyChatStyle).toHaveBeenCalledTimes(1)
    expect(setIsIframeLoaded).toHaveBeenLastCalledWith(true)
    expect(setIsDisplay).toHaveBeenLastCalledWith(true)
    expect(setLoadState).toHaveBeenLastCalledWith('ready')
  })

  it('fails open and retries style initialization when document access is blocked', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'

    const doc = createChatDoc()
    let blocked = true
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        if (blocked) {
          throw new DOMException('Blocked by cross-origin policy', 'SecurityError')
        }
        return doc
      },
      configurable: true,
    })

    const applyChatStyle = vi.fn()
    const setIsIframeLoaded = vi.fn()
    const setIsDisplay = vi.fn()
    const setLoadState = vi.fn<(state: IframeLoadState) => void>()
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded,
      setIsDisplay,
      setLoadState,
      retryIntervalMs: 100,
      retryMaxAttempts: 3,
    })

    const initialized = initializer.initialize(iframe)
    expect(initialized).toBe(false)
    expect(setIsIframeLoaded).toHaveBeenCalledWith(true)
    expect(setIsDisplay).toHaveBeenCalledWith(true)
    expect(applyChatStyle).toHaveBeenCalledTimes(0)

    blocked = false
    vi.advanceTimersByTime(100)

    expect(applyChatStyle).toHaveBeenCalledTimes(1)
    expect(doc.head?.querySelector('style[data-ylc-style-injected="true"]')).not.toBeNull()
  })

  it('does not inject duplicate styles when initialized repeatedly', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    const doc = createChatDoc()
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const applyChatStyle = vi.fn()
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded: vi.fn(),
      setIsDisplay: vi.fn(),
      setLoadState: vi.fn(),
    })

    initializer.initialize(iframe)
    initializer.initialize(iframe)

    expect(doc.head?.querySelectorAll('style[data-ylc-style-injected="true"]').length).toBe(1)
    expect(applyChatStyle).toHaveBeenCalledTimes(1)
  })
})
