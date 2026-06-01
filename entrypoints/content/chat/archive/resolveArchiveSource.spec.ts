import { beforeEach, describe, expect, it } from 'vitest'
import { markChatIframeObservedForCurrentVideo, YLC_CHAT_ATTR } from '../shared/iframeDom'
import { resolveArchiveSource } from './resolveArchiveSource'

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

const createNativeChatIframe = (
  videoId: string,
  options: {
    srcPath?: string
    docPath?: string
    srcHref?: string
    docHref?: string
  } = {},
) => {
  const srcPath = options.srcPath ?? 'live_chat_replay'
  const docPath = options.docPath ?? 'live_chat_replay'
  const frame = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = options.srcHref ?? `https://www.youtube.com/${srcPath}?v=${videoId}`
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  const chatDocument = {
    location: { href: options.docHref ?? `https://www.youtube.com/${docPath}?v=${videoId}` } as Location,
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

describe('resolveArchiveSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLocation('/watch?v=video-a')
  })

  it('returns archive_borrow only for replay iframe with playable markers', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')

    const source = resolveArchiveSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(iframe)
    }
  })

  it('returns null for live chat iframe', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-a', {
      srcPath: 'live_chat',
      docPath: 'live_chat',
    })

    const source = resolveArchiveSource()
    expect(source).toBeNull()
  })

  it('returns null when replay iframe is for another video', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-b')

    const source = resolveArchiveSource()
    expect(source).toBeNull()
  })

  it('returns null for a continuation-only replay iframe when page DOM is stale', () => {
    setLocation('/watch?v=video-b')
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-a', {
      srcHref: 'https://www.youtube.com/live_chat_replay?continuation=stale-video-a',
      docHref: 'https://www.youtube.com/live_chat_replay?continuation=stale-video-a',
    })

    const source = resolveArchiveSource()
    expect(source).toBeNull()
  })

  it('allows a continuation-only replay iframe when it was observed for the current video', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a', {
      srcHref: 'https://www.youtube.com/live_chat_replay?continuation=current-video-a',
      docHref: 'https://www.youtube.com/live_chat_replay?continuation=current-video-a',
    })
    markChatIframeObservedForCurrentVideo(iframe, 'video-a')

    const source = resolveArchiveSource()
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(iframe)
    }
  })

  it('prefers URL video id over stale watch DOM when matching archive source', () => {
    setLocation('/watch?v=video-a')
    createWatchFlexy({ 'video-id': 'video-b' })
    createNativeChatIframe('video-b')

    const source = resolveArchiveSource()
    expect(source).toBeNull()
  })

  it('keeps borrowed current iframe when native query cannot find #chatframe', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')
    iframe.setAttribute(YLC_CHAT_ATTR, 'true')

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

    const source = resolveArchiveSource(iframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
  })

  it('falls back to a valid borrowed current iframe when visible native iframe is stale', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-b')
    const borrowedIframe = createNativeChatIframe('video-a')
    borrowedIframe.setAttribute(YLC_CHAT_ATTR, 'true')

    const source = resolveArchiveSource(borrowedIframe)

    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(borrowedIframe)
    }
  })

  it('uses the current native iframe when a stale #chatframe appears first', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    createNativeChatIframe('video-b')
    const currentIframe = createNativeChatIframe('video-a')

    const source = resolveArchiveSource()

    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
    if (source?.kind === 'archive_borrow') {
      expect(source.iframe).toBe(currentIframe)
    }
  })

  it('does not treat a connected current iframe as borrowed without the ylc chat marker', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')

    const shadowHost = document.createElement('div')
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const extensionContainer = document.createElement('div')
    shadowRoot.appendChild(extensionContainer)
    document.body.appendChild(shadowHost)

    const frameHost = iframe.closest('ytd-live-chat-frame')
    if (frameHost) {
      extensionContainer.appendChild(frameHost)
    }

    const source = resolveArchiveSource(iframe)
    expect(source).toBeNull()
  })

  it('does not treat an owned current iframe as borrowed archive', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')
    iframe.setAttribute(YLC_CHAT_ATTR, 'true')
    iframe.setAttribute('data-ylc-owned', 'true')

    const shadowHost = document.createElement('div')
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' })
    const extensionContainer = document.createElement('div')
    shadowRoot.appendChild(extensionContainer)
    document.body.appendChild(shadowHost)

    const frameHost = iframe.closest('ytd-live-chat-frame')
    if (frameHost) {
      extensionContainer.appendChild(frameHost)
    }

    const source = resolveArchiveSource(iframe)
    expect(source).toBeNull()
  })
})
