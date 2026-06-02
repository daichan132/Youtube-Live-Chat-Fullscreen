import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_CHAT_BODY_CLASS, IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'
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
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded,
      setIsDisplay,
    })

    const initialized = initializer.initialize(iframe)
    expect(initialized).toBe(true)
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).not.toBeNull()
    expect(doc.body.classList.contains(IFRAME_CHAT_BODY_CLASS)).toBe(true)
    expect(applyChatStyle).toHaveBeenCalledTimes(1)
    expect(setIsIframeLoaded).toHaveBeenLastCalledWith(true)
    expect(setIsDisplay).toHaveBeenLastCalledWith(true)
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
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded,
      setIsDisplay,
      retryIntervalMs: 100,
      retryMaxAttempts: 3,
    })

    const initialized = initializer.initialize(iframe)
    expect(initialized).toBe(false)
    expect(setIsIframeLoaded).not.toHaveBeenCalled()
    expect(setIsDisplay).toHaveBeenCalledWith(true)
    expect(applyChatStyle).toHaveBeenCalledTimes(0)

    blocked = false
    vi.advanceTimersByTime(100)

    expect(applyChatStyle).toHaveBeenCalledTimes(1)
    expect(setIsIframeLoaded).toHaveBeenCalledWith(true)
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).not.toBeNull()
  })

  it('falls back to showing content when retries are exhausted', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'

    Object.defineProperty(iframe, 'contentDocument', {
      get: () => {
        throw new DOMException('Blocked by cross-origin policy', 'SecurityError')
      },
      configurable: true,
    })

    const applyChatStyle = vi.fn()
    const setIsIframeLoaded = vi.fn()
    const setIsDisplay = vi.fn()
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle,
      setIsIframeLoaded,
      setIsDisplay,
      retryIntervalMs: 100,
      retryMaxAttempts: 3,
    })

    initializer.initialize(iframe)
    expect(setIsIframeLoaded).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100 * 2)
    expect(setIsIframeLoaded).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(setIsIframeLoaded).toHaveBeenCalledWith(true)
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
    })

    initializer.initialize(iframe)
    initializer.initialize(iframe)

    expect(doc.head?.querySelectorAll(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`).length).toBe(1)
    expect(applyChatStyle).toHaveBeenCalledTimes(1)
  })

  it('opens the channel join page when membership picker fallback is clicked', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    const doc = createChatDoc()
    const item = doc.createElement('yt-live-chat-product-picker-panel-item-view-model')
    item.setAttribute('item-id', 'Membership')
    const endpoint = doc.createElement('a')
    endpoint.id = 'endpoint'
    endpoint.textContent = 'Membership'
    item.appendChild(endpoint)
    Object.defineProperty(item, 'data', {
      value: {
        onTapCommand: {
          parallelCommand: {
            commands: [
              {
                innertubeCommand: {
                  ypcGetOffersEndpoint: {
                    params: `sku-${encodeURIComponent(btoa('channel:UCSJ4gkVC6NrvII8umztf0Ow'))}`,
                  },
                },
              },
            ],
          },
        },
      },
      configurable: true,
    })
    doc.body.appendChild(item)
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const initializer = createIframeInitializer({
      iframeStyles: 'body { color: red; }',
      applyChatStyle: vi.fn(),
      setIsIframeLoaded: vi.fn(),
      setIsDisplay: vi.fn(),
    })

    initializer.initialize(iframe)
    endpoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(openSpy).toHaveBeenCalledWith('https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow/join', '_blank', 'noopener')
  })
})
