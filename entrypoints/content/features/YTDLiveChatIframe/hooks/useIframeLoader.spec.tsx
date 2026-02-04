import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('uno.css', () => ({}), { virtual: true })
vi.mock('@/entrypoints/content', () => ({}))

import { useIframeLoader } from './useIframeLoader'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createLiveChatDoc = () => document.implementation.createHTMLDocument('chat') as Document

const attachLiveChatFrame = () => {
  const frame = document.createElement('ytd-live-chat-frame')
  document.body.appendChild(frame)
  return frame
}

const createChatIframe = (videoId: string) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/live_chat?v=${videoId}`
  const doc = createLiveChatDoc()
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

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
})

describe('useIframeLoader', () => {
  it('attaches the live chat iframe when it matches the current video', async () => {
    const frame = attachLiveChatFrame()
    const iframe = createChatIframe('video-a')
    frame.appendChild(iframe)

    const { getByTestId } = render(<TestComponent />)
    const container = getByTestId('container')

    await waitFor(() => {
      expect(container.contains(iframe)).toBe(true)
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

  it('attaches when iframe appears later via MutationObserver', async () => {
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
})
