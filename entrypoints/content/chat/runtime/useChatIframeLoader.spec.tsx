import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
import { markChatIframeObservedForCurrentVideo } from '@/entrypoints/content/chat/shared/iframeDom'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

vi.mock('@/entrypoints/content', () => ({}))
vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createPlayableLiveChatDoc = (videoId: string, options: { href?: string } = {}) => {
  const href = options.href ?? `https://www.youtube.com/live_chat_replay?v=${videoId}`
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  return {
    location: { href } as Location,
    body,
    querySelector: (selector: string) => {
      if (selector === 'yt-live-chat-renderer') return renderer
      if (selector === 'yt-live-chat-item-list-renderer') return itemList
      return null
    },
  } as unknown as Document
}

const createUnavailableLiveChatDoc = (videoId: string) => {
  const unavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
  const body = document.createElement('body')
  body.appendChild(unavailable)
  return {
    location: { href: `https://www.youtube.com/live_chat?v=${videoId}` } as Location,
    body,
    querySelector: (selector: string) => {
      if (selector === 'yt-live-chat-unavailable-message-renderer') return unavailable
      return null
    },
  } as unknown as Document
}

const attachLiveChatFrame = () => {
  const frame = document.createElement('ytd-live-chat-frame')
  document.body.appendChild(frame)
  return frame
}

const createWatchFlexy = (videoId: string) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  watchFlexy.setAttribute('video-id', videoId)
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

const createChatIframe = (
  videoId: string,
  options: {
    src?: string
    docHref?: string
  } = {},
) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = options.src ?? `https://www.youtube.com/live_chat?v=${videoId}`
  const doc = createPlayableLiveChatDoc(videoId, { href: options.docHref })
  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })
  return iframe
}

const expectPublicLiveChatUrl = (iframe: HTMLIFrameElement, expectedVideoId: string) => {
  const url = new URL(iframe.src)
  expect(url.origin).toBe('https://www.youtube.com')
  expect(url.pathname).toBe('/live_chat')
  expect(url.searchParams.get('v')).toBe(expectedVideoId)
  expect(url.searchParams.toString()).toBe(`v=${expectedVideoId}`)
}

const TestComponent = ({ mode }: { mode: ChatMode }) => {
  const { ref } = useChatIframeLoader(mode)
  return <div data-testid='container' ref={ref} />
}

const noLsStoreBaseState = useYTDLiveChatNoLsStore.getState()

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
  useYTDLiveChatNoLsStore.setState(noLsStoreBaseState, true)
})

describe('useChatIframeLoader', () => {
  it('borrows archive iframe when native chat matches current video and is playable', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
      expect(iframe.getAttribute('data-ylc-owned')).toBeNull()
      expect(iframe.getAttribute('data-ylc-chat')).toBe('true')
    })
  })

  it('keeps a borrowed live iframe attached when fullscreen exits while the overlay remains mounted', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
    })

    document.dispatchEvent(new Event('fullscreenchange'))

    expect(container.contains(iframe)).toBe(true)
    expect(iframe.getAttribute('data-ylc-chat')).toBe('true')
  })

  it('restores borrowed archive iframe when mode changes to none', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId, rerender } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
      expect(useYTDLiveChatNoLsStore.getState().iframeElement).toBe(iframe)
    })

    rerender(<TestComponent mode='none' />)

    await waitFor(() => {
      expect(container.querySelector('iframe')).toBeNull()
      expect(frame.contains(iframe)).toBe(true)
      expect(iframe.getAttribute('data-ylc-chat')).toBeNull()
      expect(useYTDLiveChatNoLsStore.getState().iframeElement).toBeNull()
    })
  })

  it('detaches on navigation and does not attach iframe for another video', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
    })

    setLocation('/watch?v=video-b')
    document.dispatchEvent(new Event('yt-navigate-finish'))

    await waitFor(() => {
      expect(container.querySelector('iframe')).toBeNull()
      expect(frame.contains(iframe)).toBe(false)
      expect(iframe.isConnected).toBe(false)
    })
  })

  it('detaches on video transition even when yt-navigate-finish is not fired', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
    })

    setLocation('/watch?v=video-b')

    await waitFor(
      () => {
        expect(container.querySelector('iframe')).toBeNull()
        expect(frame.contains(iframe)).toBe(false)
        expect(iframe.isConnected).toBe(false)
      },
      { timeout: 4000 },
    )
  })

  it('does not reattach stale archive iframe href after navigation until source changes', async () => {
    const frame = attachLiveChatFrame()
    const watchFlexy = createWatchFlexy('video-a')
    const staleHref = 'https://www.youtube.com/live_chat_replay?continuation=stale-video-a'
    const iframe = createChatIframe('video-a', {
      src: staleHref,
      docHref: staleHref,
    })
    markChatIframeObservedForCurrentVideo(iframe, 'video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
    })

    setLocation('/watch?v=video-b')
    document.dispatchEvent(new Event('yt-navigate-finish'))

    await waitFor(() => {
      expect(container.querySelector('iframe')).toBeNull()
      expect(frame.contains(iframe)).toBe(false)
      expect(iframe.isConnected).toBe(false)
    })

    frame.replaceChildren()
    watchFlexy.setAttribute('video-id', 'video-b')
    const freshHref = 'https://www.youtube.com/live_chat_replay?continuation=fresh-video-b'
    const nextIframe = createChatIframe('video-b', {
      src: freshHref,
      docHref: freshHref,
    })
    markChatIframeObservedForCurrentVideo(nextIframe, 'video-b')
    frame.appendChild(nextIframe)

    await waitFor(() => {
      expect(container.contains(nextIframe)).toBe(true)
      expect(container.contains(iframe)).toBe(false)
    })
  })

  it('attaches when playable archive iframe appears later via MutationObserver', async () => {
    const frame = attachLiveChatFrame()

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    expect(container.querySelector('iframe')).toBeNull()

    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
    })
  })

  it('borrows native iframe for live streams when available', async () => {
    const frame = attachLiveChatFrame()
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    frame.appendChild(nativeIframe)

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('is-live-now', '')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(nativeIframe)).toBe(true)
      expect(nativeIframe.getAttribute('data-ylc-owned')).toBeNull()
      expect(nativeIframe.getAttribute('data-ylc-chat')).toBe('true')
      expect(frame.contains(nativeIframe)).toBe(false)
    })
  })

  it('records terminal state before attaching an unavailable native live iframe', async () => {
    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    Object.defineProperty(nativeIframe, 'contentDocument', {
      value: createUnavailableLiveChatDoc('video-a'),
      configurable: true,
    })
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
      expect(container.querySelector('iframe')).toBeNull()
      expect(frame.contains(nativeIframe)).toBe(true)
    })
  })

  it('detaches a borrowed native live iframe when its loaded document becomes unavailable', async () => {
    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(nativeIframe)).toBe(true)
    })

    Object.defineProperty(nativeIframe, 'contentDocument', {
      value: createUnavailableLiveChatDoc('video-a'),
      configurable: true,
    })
    nativeIframe.dispatchEvent(new Event('load'))

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
      expect(container.contains(nativeIframe)).toBe(false)
      expect(frame.contains(nativeIframe)).toBe(true)
      expect(nativeIframe.getAttribute('data-ylc-chat')).toBeNull()
    })
  })

  it('detects unavailable hydration after a borrowed native iframe load without another load event', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    const nativeDocument = nativeIframe.contentDocument
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    try {
      const { getByTestId } = render(<TestComponent mode='live' />)
      const container = getByTestId('container')

      await waitFor(() => {
        expect(container.contains(nativeIframe)).toBe(true)
      })

      const unavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
      nativeDocument?.body.appendChild(unavailable)
      const originalQuerySelector = nativeDocument?.querySelector.bind(nativeDocument)
      if (nativeDocument && originalQuerySelector) {
        Object.defineProperty(nativeDocument, 'querySelector', {
          value: (selector: string) =>
            selector === 'yt-live-chat-unavailable-message-renderer' ? unavailable : originalQuerySelector(selector),
          configurable: true,
        })
      }

      await vi.advanceTimersByTimeAsync(1000)
      await waitFor(() => {
        expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
        expect(container.contains(nativeIframe)).toBe(false)
        expect(frame.contains(nativeIframe)).toBe(true)
      })

      await vi.advanceTimersByTimeAsync(3000)
      expect(container.querySelector('iframe')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('captures a hydrated borrowed document before retry styling and fully restores it on unavailable detach', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeIframe = document.createElement('iframe') as HTMLIFrameElement
    nativeIframe.className = 'ytd-live-chat-frame'
    nativeIframe.src = 'https://www.youtube.com/live_chat?v=video-a'

    const backingDocument = document.implementation.createHTMLDocument('pending-live-chat')
    backingDocument.documentElement.style.setProperty('--yt-live-chat-background-color', 'rgb(1, 2, 3)', 'important')
    backingDocument.body.style.setProperty('backdrop-filter', 'blur(2px)', 'important')
    const nativeFontStyle = backingDocument.createElement('style')
    nativeFontStyle.id = 'custom-font-style'
    nativeFontStyle.textContent = '@font-face { font-family: NativeChat; }'
    backingDocument.head.appendChild(nativeFontStyle)
    let ready = false
    const pendingDocument = {
      location: { href: 'https://www.youtube.com/live_chat?v=video-a' } as Location,
      get documentElement() {
        return ready ? backingDocument.documentElement : null
      },
      get head() {
        return ready ? backingDocument.head : null
      },
      get body() {
        return ready ? backingDocument.body : null
      },
      createElement: backingDocument.createElement.bind(backingDocument),
      querySelector: (selector: string) => (ready ? backingDocument.querySelector(selector) : null),
    } as unknown as Document
    Object.defineProperty(nativeIframe, 'contentDocument', {
      value: pendingDocument,
      configurable: true,
    })
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')
    const previousStyle = useYTDLiveChatStore.getState()
    useYTDLiveChatStore.setState({ fontFamily: 'Inter', blur: 8 })

    try {
      const { getByTestId } = render(<TestComponent mode='live' />)
      const container = getByTestId('container')
      await waitFor(() => {
        expect(container.contains(nativeIframe)).toBe(true)
      })

      ready = true
      backingDocument.body.appendChild(backingDocument.createElement('yt-live-chat-unavailable-message-renderer'))

      await vi.advanceTimersByTimeAsync(1000)
      await waitFor(() => {
        expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
        expect(frame.contains(nativeIframe)).toBe(true)
      })

      expect(backingDocument.documentElement.style.getPropertyValue('--yt-live-chat-background-color')).toBe('rgb(1, 2, 3)')
      expect(backingDocument.documentElement.style.getPropertyPriority('--yt-live-chat-background-color')).toBe('important')
      expect(backingDocument.body.style.getPropertyValue('backdrop-filter')).toBe('blur(2px)')
      expect(backingDocument.body.style.getPropertyPriority('backdrop-filter')).toBe('important')
      expect(backingDocument.head.querySelector('#custom-font-style')).toBe(nativeFontStyle)
      expect(nativeFontStyle.textContent).toBe('@font-face { font-family: NativeChat; }')
      expect(backingDocument.head.querySelector('style[data-ylc-style-injected="true"]')).toBeNull()
    } finally {
      useYTDLiveChatStore.setState({ fontFamily: previousStyle.fontFamily, blur: previousStyle.blur })
      vi.useRealTimers()
    }
  })

  it('stops borrowed availability monitoring after unmount', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    const nativeDocument = nativeIframe.contentDocument
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    try {
      const { getByTestId, unmount } = render(<TestComponent mode='live' />)
      const container = getByTestId('container')
      await waitFor(() => {
        expect(container.contains(nativeIframe)).toBe(true)
      })

      unmount()
      const unavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
      const originalQuerySelector = nativeDocument?.querySelector.bind(nativeDocument)
      if (nativeDocument && originalQuerySelector) {
        Object.defineProperty(nativeDocument, 'querySelector', {
          value: (selector: string) =>
            selector === 'yt-live-chat-unavailable-message-renderer' ? unavailable : originalQuerySelector(selector),
          configurable: true,
        })
      }

      await vi.advanceTimersByTimeAsync(2000)
      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
      expect(frame.contains(nativeIframe)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('upgrades a managed live iframe to a borrowed native iframe when native chat appears later', async () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('is-live-now', '')
    watchFlexy.setAttribute('live-chat-present', '')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    let firstManagedIframe: HTMLIFrameElement | null = null
    await waitFor(() => {
      firstManagedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(firstManagedIframe).not.toBeNull()
      if (!firstManagedIframe) return
      expectPublicLiveChatUrl(firstManagedIframe, 'video-a')
    })

    const frame = attachLiveChatFrame()
    frame.setAttribute('video-id', 'video-a')
    const nativeUrl = 'https://www.youtube.com/live_chat?continuation=current-live-chat&authuser=0'
    const nativeIframe = createChatIframe('video-a', {
      src: '',
      docHref: nativeUrl,
    })
    frame.appendChild(nativeIframe)

    await waitFor(
      () => {
        expect(container.contains(nativeIframe)).toBe(true)
        expect(nativeIframe.getAttribute('data-ylc-owned')).toBeNull()
        expect(nativeIframe.getAttribute('data-ylc-chat')).toBe('true')
        expect(firstManagedIframe?.isConnected).toBe(false)
        expect(frame.contains(nativeIframe)).toBe(false)
      },
      { timeout: 3000 },
    )
  })

  it('borrows the next native iframe when it appears after a live video transition', async () => {
    const frame = attachLiveChatFrame()
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    frame.appendChild(nativeIframe)

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('is-live-now', '')
    watchFlexy.setAttribute('live-chat-present', '')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(nativeIframe)).toBe(true)
      expect(nativeIframe.getAttribute('data-ylc-chat')).toBe('true')
    })

    watchFlexy.setAttribute('video-id', 'video-b')
    setLocation('/watch?v=video-b')
    document.dispatchEvent(new Event('yt-navigate-finish'))

    await waitFor(() => {
      const managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(managedIframe).not.toBeNull()
      if (!managedIframe) return
      expectPublicLiveChatUrl(managedIframe, 'video-b')
      expect(nativeIframe.isConnected).toBe(false)
    })

    const nextNativeIframe = createChatIframe('video-b', {
      docHref: 'https://www.youtube.com/live_chat?v=video-b',
    })
    frame.setAttribute('video-id', 'video-b')
    frame.appendChild(nextNativeIframe)

    await waitFor(() => {
      expect(container.contains(nextNativeIframe)).toBe(true)
      expect(nextNativeIframe.getAttribute('data-ylc-owned')).toBeNull()
      expect(nextNativeIframe.getAttribute('data-ylc-chat')).toBe('true')
    })
  })

  it('detaches a stale borrowed live iframe when video id changes without yt-navigate-finish', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const frame = attachLiveChatFrame()
    const nativeIframe = createChatIframe('video-a', {
      docHref: 'https://www.youtube.com/live_chat?v=video-a',
    })
    const staleNativeDocument = nativeIframe.contentDocument
    frame.appendChild(nativeIframe)

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    try {
      const { getByTestId } = render(<TestComponent mode='live' />)
      const container = getByTestId('container')

      await waitFor(() => {
        expect(container.contains(nativeIframe)).toBe(true)
      })

      watchFlexy.setAttribute('video-id', 'video-b')
      setLocation('/watch?v=video-b')
      await vi.advanceTimersByTimeAsync(1000)

      await waitFor(() => {
        const managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
        expect(managedIframe).not.toBeNull()
        if (managedIframe) expectPublicLiveChatUrl(managedIframe, 'video-b')
        expect(nativeIframe.isConnected).toBe(false)
      })

      const staleUnavailable = document.createElement('yt-live-chat-unavailable-message-renderer')
      const originalQuerySelector = staleNativeDocument?.querySelector.bind(staleNativeDocument)
      if (staleNativeDocument && originalQuerySelector) {
        Object.defineProperty(staleNativeDocument, 'querySelector', {
          value: (selector: string) =>
            selector === 'yt-live-chat-unavailable-message-renderer' ? staleUnavailable : originalQuerySelector(selector),
          configurable: true,
        })
      }
      await vi.advanceTimersByTimeAsync(1000)

      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
      const currentManagedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(currentManagedIframe).not.toBeNull()
      if (currentManagedIframe) expectPublicLiveChatUrl(currentManagedIframe, 'video-b')
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits until archive iframe becomes playable before attaching', async () => {
    const frame = attachLiveChatFrame()
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    Object.defineProperty(iframe, 'contentDocument', {
      value: null,
      configurable: true,
    })
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent mode='archive' />)
    const container = getByTestId('container')

    expect(container.contains(iframe)).toBe(false)

    Object.defineProperty(iframe, 'contentDocument', {
      value: createPlayableLiveChatDoc('video-a'),
      configurable: true,
    })

    await waitFor(
      () => {
        expect(container.contains(iframe)).toBe(true)
      },
      { timeout: 3000 },
    )
  })

  it('marks managed live iframe loaded when document access is restricted even if load event is missed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('is-live-now', '')
    watchFlexy.setAttribute('live-chat-present', '')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument')
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
      get: () => {
        throw new DOMException('Blocked by cross-origin policy', 'SecurityError')
      },
      configurable: true,
    })

    try {
      render(<TestComponent mode='live' />)

      await waitFor(() => {
        const iframe = useYTDLiveChatNoLsStore.getState().iframeElement
        expect(iframe).not.toBeNull()
        expect(iframe?.getAttribute('data-ylc-owned')).toBe('true')
      })

      // Advance past retry exhaustion (default: 10 retries * 1000ms)
      await vi.advanceTimersByTimeAsync(10 * 1000)

      expect(useYTDLiveChatNoLsStore.getState().isIframeLoaded).toBe(true)
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', originalDescriptor)
      }
      vi.useRealTimers()
    }
  })

  it('stops recreating managed live iframe after chat is confirmed unavailable', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')

    try {
      const { getByTestId } = render(<TestComponent mode='live' />)
      const container = getByTestId('container')

      let managedIframe: HTMLIFrameElement | null = null
      await waitFor(() => {
        managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
        expect(managedIframe).not.toBeNull()
      })
      if (!managedIframe) throw new Error('Expected managed live iframe')

      Object.defineProperty(managedIframe, 'contentDocument', {
        value: createUnavailableLiveChatDoc('video-a'),
        configurable: true,
      })

      await vi.advanceTimersByTimeAsync(1000)
      await waitFor(() => {
        expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBe('video-a')
        expect(useYTDLiveChatNoLsStore.getState().iframeElement).toBeNull()
        expect(container.querySelector('iframe')).toBeNull()
      })

      await vi.advanceTimersByTimeAsync(3000)
      expect(useYTDLiveChatNoLsStore.getState().iframeElement).toBeNull()
      expect(container.querySelector('iframe')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('resets terminal live availability when SPA navigation changes video', async () => {
    const watchFlexy = createWatchFlexy('video-a')
    watchFlexy.setAttribute('is-live-now', '')
    useYTDLiveChatNoLsStore.setState({ unavailableLiveChatVideoId: 'video-a' })

    const { getByTestId } = render(<TestComponent mode='live' />)
    const container = getByTestId('container')

    expect(container.querySelector('iframe')).toBeNull()

    watchFlexy.setAttribute('video-id', 'video-b')
    setLocation('/watch?v=video-b')
    document.dispatchEvent(new Event('yt-navigate-finish'))

    await waitFor(() => {
      expect(useYTDLiveChatNoLsStore.getState().unavailableLiveChatVideoId).toBeNull()
      const managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(managedIframe).not.toBeNull()
      if (managedIframe) expectPublicLiveChatUrl(managedIframe, 'video-b')
    })
  })
})
