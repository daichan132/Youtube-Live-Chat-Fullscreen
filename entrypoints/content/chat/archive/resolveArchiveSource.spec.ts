import { beforeEach, describe, expect, it } from 'vitest'
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
  } = {},
) => {
  const srcPath = options.srcPath ?? 'live_chat_replay'
  const docPath = options.docPath ?? 'live_chat_replay'
  const frame = document.createElement('ytd-live-chat-frame')
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  iframe.className = 'ytd-live-chat-frame'
  iframe.src = `https://www.youtube.com/${srcPath}?v=${videoId}`
  const renderer = document.createElement('yt-live-chat-renderer')
  const itemList = document.createElement('yt-live-chat-item-list-renderer')
  const body = document.createElement('body')
  const chatDocument = {
    location: { href: `https://www.youtube.com/${docPath}?v=${videoId}` } as Location,
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

  it('keeps borrowed current iframe when native query cannot find #chatframe', () => {
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

    const source = resolveArchiveSource(iframe)
    expect(source).not.toBeNull()
    expect(source?.kind).toBe('archive_borrow')
  })

  it('does not reuse borrowed current iframe when disabled', () => {
    createWatchFlexy({ 'video-id': 'video-a' })
    const iframe = createNativeChatIframe('video-a')
    iframe.setAttribute('data-ylc-chat', 'true')
    iframe.remove()

    const source = resolveArchiveSource(iframe, { allowBorrowedCurrent: false })
    expect(source).toBeNull()
  })
})
