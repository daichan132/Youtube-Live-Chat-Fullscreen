import { beforeEach, describe, expect, it } from 'vitest'
import { resolveChatSource } from './chatSourceResolver'

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (attrs: Record<string, string | null> = {}) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null) {
      watchFlexy.setAttribute(key, '')
      continue
    }
    watchFlexy.setAttribute(key, value)
  }
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

const createNativeChatIframe = (videoId: string) => {
  const frame = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/live_chat?v=${videoId}`
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  const chatDocument = {
    location: { href: `https://www.youtube.com/live_chat_replay?v=${videoId}` } as Location,
    body,
    querySelector: (selector: string) => {
      if (selector === 'yt-live-chat-renderer') return renderer
      if (selector === 'yt-live-chat-item-list-renderer') return itemList
      return null
    },
  } as unknown as Document
  Object.defineProperty(iframe, 'contentDocument', {
    value: chatDocument,
    configurable: true,
  })
  frame.appendChild(iframe)
  document.body.appendChild(frame)
  return iframe
}

const createMoviePlayer = (videoId: string, isLive: boolean) => {
  const moviePlayer = document.createElement('div') as HTMLElement & {
    getVideoData?: () => { isLive: boolean; video_id: string }
  }
  moviePlayer.id = 'movie_player'
  moviePlayer.getVideoData = () => ({
    isLive,
    video_id: videoId,
  })
  document.body.appendChild(moviePlayer)
  return moviePlayer
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
})

describe('resolveChatSource', () => {
  it('returns live_direct when stream is live and video id is available', () => {
    createWatchFlexy({ 'is-live-now': null, 'video-id': 'video-live' })

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    if (source?.kind === 'live_direct') {
      expect(source.videoId).toBe('video-live')
      expect(source.url).toBe('https://www.youtube.com/live_chat?v=video-live')
    }
  })

  it('returns live_direct when movie player reports live without is-live-now attribute', () => {
    createWatchFlexy({ 'video-id': 'video-live' })
    createMoviePlayer('video-live', true)

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('live_direct')
    if (source?.kind === 'live_direct') {
      expect(source.videoId).toBe('video-live')
      expect(source.url).toBe('https://www.youtube.com/live_chat?v=video-live')
    }
  })

  it('returns archive_borrow when native iframe matches current video and replay is playable', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')

    const source = resolveChatSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(iframe)
    }
  })

  it('keeps archive_borrow from current borrowed iframe when native query cannot find #chatframe', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')
    iframe.setAttribute('data-ylc-chat', 'true')

    const shadowHost = document.createElement('div')
    shadowHost.id = 'shadow-root-live-chat'
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const extensionContainer = document.createElement('div')
    shadowRoot.appendChild(extensionContainer)
    document.body.appendChild(shadowHost)

    const frameHost = iframe.closest('ytd-live-chat-frame')
    if (frameHost) {
      extensionContainer.appendChild(frameHost)
    }

    expect(document.querySelector('#chatframe')).toBeNull()

    const source = resolveChatSource(iframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(iframe)
    }
  })

  it('returns null when native iframe video does not match current video', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-b')

    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when native iframe exists but replay is not playable yet', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const frame = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    Object.defineProperty(iframe, 'contentDocument', {
      value: null,
      configurable: true,
    })
    frame.appendChild(iframe)
    document.body.appendChild(frame)

    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when native panel is expanded but replay document is not playable yet', () => {
    createWatchFlexy({ 'video-id': 'video-a', 'live-chat-present-and-expanded': null })
    const frame = document.createElement('ytd-live-chat-frame')
    const showHideButton = document.createElement('div')
    showHideButton.id = 'show-hide-button'
    showHideButton.setAttribute('hidden', '')
    frame.appendChild(showHideButton)

    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.className = 'ytd-live-chat-frame'
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    Object.defineProperty(iframe, 'contentDocument', {
      value: null,
      configurable: true,
    })

    frame.appendChild(iframe)
    document.body.appendChild(frame)

    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when no source is available', () => {
    const source = resolveChatSource()
    expect(source).toBeNull()
  })

  it('returns null when stream is live but video id is not ready', () => {
    setLocation('/watch')
    createWatchFlexy({ 'is-live-now': null })
    createNativeChatIframe('video-a')

    const source = resolveChatSource()
    expect(source).toBeNull()
  })
})
