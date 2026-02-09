import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMode } from '@/entrypoints/content/chat/runtime/types'
import { useChatIframeLoader } from '@/entrypoints/content/chat/runtime/useChatIframeLoader'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

vi.mock('@/entrypoints/content', () => ({}))

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

const attachLiveChatFrame = () => {
  const frame = document.createElement('ytd-live-chat-frame')
  document.body.appendChild(frame)
  return frame
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
      expect(frame.contains(iframe)).toBe(true)
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
        expect(frame.contains(iframe)).toBe(true)
      },
      { timeout: 4000 },
    )
  })

  it('does not reattach stale archive iframe href after navigation until source changes', async () => {
    const frame = attachLiveChatFrame()
    const staleHref = 'https://www.youtube.com/live_chat_replay?continuation=stale-video-a'
    const iframe = createChatIframe('video-a', {
      src: staleHref,
      docHref: staleHref,
    })
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
      expect(frame.contains(iframe)).toBe(true)
    })

    frame.replaceChildren()
    const freshHref = 'https://www.youtube.com/live_chat_replay?continuation=fresh-video-b'
    const nextIframe = createChatIframe('video-b', {
      src: freshHref,
      docHref: freshHref,
    })
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

  it('creates a managed iframe for live streams instead of borrowing native iframe', async () => {
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
      const managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(managedIframe).not.toBeNull()
      expect(managedIframe).not.toBe(nativeIframe)
      if (!managedIframe) return
      expectPublicLiveChatUrl(managedIframe, 'video-a')
      expect(container.contains(nativeIframe)).toBe(false)
      expect(frame.contains(nativeIframe)).toBe(true)
      expect(nativeIframe.getAttribute('data-ylc-chat')).toBeNull()
    })
  })

  it('recreates managed public iframe on live video transition', async () => {
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

    let firstManagedIframe: HTMLIFrameElement | null = null
    await waitFor(() => {
      firstManagedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(firstManagedIframe).not.toBeNull()
      if (!firstManagedIframe) return
      expectPublicLiveChatUrl(firstManagedIframe, 'video-a')
    })

    nativeIframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    Object.defineProperty(nativeIframe, 'contentDocument', {
      value: createPlayableLiveChatDoc('video-b', { href: 'https://www.youtube.com/live_chat?v=video-b' }),
      configurable: true,
    })
    watchFlexy.setAttribute('video-id', 'video-b')
    setLocation('/watch?v=video-b')
    document.dispatchEvent(new Event('yt-navigate-finish'))

    await waitFor(() => {
      const nextManagedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(nextManagedIframe).not.toBeNull()
      expect(nextManagedIframe).not.toBe(firstManagedIframe)
      if (!nextManagedIframe) return
      expectPublicLiveChatUrl(nextManagedIframe, 'video-b')
      expect(firstManagedIframe?.isConnected).toBe(false)
      expect(frame.contains(nativeIframe)).toBe(true)
      expect(nativeIframe.getAttribute('data-ylc-chat')).toBeNull()
    })
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

      await waitFor(() => {
        expect(useYTDLiveChatNoLsStore.getState().isIframeLoaded).toBe(true)
      })
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', originalDescriptor)
      }
    }
  })
})
