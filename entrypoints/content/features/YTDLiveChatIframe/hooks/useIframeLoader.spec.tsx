import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useYTDLiveChatNoLsStore } from '@/shared/stores'

vi.mock('@/entrypoints/content', () => ({}))

import { useIframeLoader } from './useIframeLoader'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createPlayableLiveChatDoc = (videoId: string) => {
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  return {
    location: { href: `https://www.youtube.com/live_chat_replay?v=${videoId}` } as Location,
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

const createChatIframe = (videoId: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/live_chat?v=${videoId}`
  const doc = createPlayableLiveChatDoc(videoId)
  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })
  return iframe
}

const TestComponent = () => {
  const { ref } = useIframeLoader()
  return <div data-testid='container' ref={ref} />
}

const noLsStoreBaseState = useYTDLiveChatNoLsStore.getState()

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
  useYTDLiveChatNoLsStore.setState(noLsStoreBaseState, true)
})

describe('useIframeLoader', () => {
  it('borrows archive iframe when native chat matches current video and is playable', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent />)
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

    const { getByTestId } = render(<TestComponent />)
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

  it('attaches when playable archive iframe appears later via MutationObserver', async () => {
    const frame = attachLiveChatFrame()

    const { getByTestId } = render(<TestComponent />)
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
    const nativeIframe = createChatIframe('video-a')
    frame.appendChild(nativeIframe)

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('is-live-now', '')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const { getByTestId } = render(<TestComponent />)
    const container = getByTestId('container')

    await waitFor(() => {
      const managedIframe = container.querySelector('iframe[data-ylc-owned="true"]') as HTMLIFrameElement | null
      expect(managedIframe).not.toBeNull()
      expect(managedIframe).not.toBe(nativeIframe)
      expect(managedIframe?.src).toContain('/live_chat?v=video-a')
      expect(container.contains(nativeIframe)).toBe(false)
      expect(frame.contains(nativeIframe)).toBe(true)
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

    const { getByTestId } = render(<TestComponent />)
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
      render(<TestComponent />)

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
