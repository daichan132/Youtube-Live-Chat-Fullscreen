import { beforeEach, describe, expect, it } from 'vitest'
import { resolveLiveSource } from './resolveLiveSource'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (attrs: Record<string, string | null>) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null) {
      watchFlexy.setAttribute(key, '')
      continue
    }
    watchFlexy.setAttribute(key, value)
  }
  document.body.appendChild(watchFlexy)
}

const createPlayableLiveChatDoc = (videoId: string, path: 'live_chat' | 'live_chat_replay' = 'live_chat') => {
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  return {
    location: { href: `https://www.youtube.com/${path}?v=${videoId}` } as Location,
    body,
    querySelector: (selector: string) => {
      if (selector === 'yt-live-chat-renderer') return renderer
      if (selector === 'yt-live-chat-item-list-renderer') return itemList
      return null
    },
  } as unknown as Document
}

const createNativeChatIframe = (videoId: string, path: 'live_chat' | 'live_chat_replay') => {
  const frame = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/${path}?v=${videoId}`
  Object.defineProperty(iframe, 'contentDocument', {
    value: createPlayableLiveChatDoc(videoId, path),
    configurable: true,
  })
  frame.appendChild(iframe)
  document.body.appendChild(frame)
  return iframe
}

describe('resolveLiveSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=video-a')
  })

  it('returns a live direct source when strong live signal and chat signals exist', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'is-live-now': null, 'live-chat-present': null })

    const source = resolveLiveSource('video-a')
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })

  it('returns null when video id is unavailable', () => {
    createWatchFlexy({ 'live-chat-present': null })

    const source = resolveLiveSource(null)
    expect(source).toBeNull()
  })

  it('returns null when live chat signals are not present', () => {
    createWatchFlexy({ 'video-id': 'video-a' })

    const source = resolveLiveSource('video-a')
    expect(source).toBeNull()
  })

  it('returns null when only watch chat attributes exist without strong live signal', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'live-chat-present': null })

    const source = resolveLiveSource('video-a')
    expect(source).toBeNull()
  })

  it('returns live direct when stream is live-now even if chat signals are missing', () => {
    // After native chat is closed, live-chat-present may be removed but
    // is-live-now alone should be sufficient to resolve a live source.
    createWatchFlexy({ 'video-id': 'video-a', 'is-live-now': null })

    const source = resolveLiveSource('video-a')
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })

  it('returns null when native iframe is replay even if watch reports live chat present', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'is-live-now': null, 'live-chat-present': null })
    createNativeChatIframe('video-a', 'live_chat_replay')

    const source = resolveLiveSource('video-a')
    expect(source).toBeNull()
  })

  it('returns live direct when native iframe is live chat even without is-live-now attribute', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-a', 'live_chat')

    const source = resolveLiveSource('video-a')
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })

  it('keeps live direct while a managed live iframe is attached and stream is live', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'is-live-now': null })
    const managedLiveIframe = document.createElement('iframe')
    managedLiveIframe.setAttribute('data-ylc-owned', 'true')
    managedLiveIframe.setAttribute('data-ylc-source', 'live_direct')

    const source = resolveLiveSource('video-a', managedLiveIframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })

  it('tolerates transient signal loss when managed live iframe exists', () => {
    const managedLiveIframe = document.createElement('iframe')
    managedLiveIframe.setAttribute('data-ylc-owned', 'true')
    managedLiveIframe.setAttribute('data-ylc-source', 'live_direct')

    const source = resolveLiveSource('video-a', managedLiveIframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    expect(source?.url).toBe('https://www.youtube.com/live_chat?v=video-a')
  })
})
