import { beforeEach, describe, expect, it } from 'vitest'
import { hasPlayableLiveChat, isArchiveChatPlayable, isLiveChatUnavailable } from './hasPlayableLiveChat'

const createLiveChatDoc = (html: string) => {
  const baseDoc = document.implementation.createHTMLDocument('chat')
  baseDoc.body.innerHTML = html
  return {
    body: baseDoc.body,
    querySelector: baseDoc.querySelector.bind(baseDoc),
    location: { href: 'https://www.youtube.com/live_chat?v=video-a' },
  } as Document
}

const attachIframeDocument = (doc: Document) => {
  const iframe = document.createElement('iframe') as HTMLIFrameElement
  iframe.id = 'chatframe'
  Object.defineProperty(iframe, 'contentDocument', {
    value: doc,
    configurable: true,
  })
  document.body.appendChild(iframe)
  return iframe
}

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

const createWatchFlexy = (videoId: string) => {
  const watchFlexy = document.createElement('ytd-watch-flexy')
  watchFlexy.setAttribute('video-id', videoId)
  document.body.appendChild(watchFlexy)
  return watchFlexy
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
})

describe('hasPlayableLiveChat', () => {
  it('returns true when watch elements indicate live chat presence', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present', '')
    document.body.appendChild(watchFlexy)

    expect(hasPlayableLiveChat()).toBe(true)
  })

  it('returns false when live chat is marked unavailable in iframe document', () => {
    const doc = createLiveChatDoc('<yt-live-chat-unavailable-message-renderer></yt-live-chat-unavailable-message-renderer>')
    attachIframeDocument(doc)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('returns false when iframe document has unavailable text', () => {
    const doc = createLiveChatDoc('Live chat replay is not available')
    attachIframeDocument(doc)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('recognizes the structural disabled-chat message used by localized YouTube pages', () => {
    const doc = createLiveChatDoc('<yt-live-chat-message-renderer>Localized unavailable message</yt-live-chat-message-renderer>')

    expect(isLiveChatUnavailable(doc)).toBe(true)
  })

  it('does not treat a normal chat renderer with a system message as unavailable', () => {
    const doc = createLiveChatDoc(`
      <yt-live-chat-renderer></yt-live-chat-renderer>
      <yt-live-chat-message-renderer>Welcome message</yt-live-chat-message-renderer>
    `)

    expect(isLiveChatUnavailable(doc)).toBe(false)
  })

  it('returns true when live chat renderer and item list are present', () => {
    createWatchFlexy('video-a')
    const doc = createLiveChatDoc(
      '<yt-live-chat-renderer></yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>',
    )
    attachIframeDocument(doc)

    expect(hasPlayableLiveChat()).toBe(true)
  })

  it('returns false when renderer nodes are missing', () => {
    const doc = createLiveChatDoc('<yt-live-chat-renderer></yt-live-chat-renderer>')
    attachIframeDocument(doc)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('returns false when live chat iframe is for another video', () => {
    const doc = createLiveChatDoc(
      '<yt-live-chat-renderer></yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>',
    )
    Object.defineProperty(doc, 'location', {
      value: { href: 'https://www.youtube.com/live_chat?v=video-b' },
      configurable: true,
    })
    attachIframeDocument(doc)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('returns false when URL points to a new video while playable iframe has only stale page markers', () => {
    setLocation('/watch?v=video-b')
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)
    const doc = createLiveChatDoc(
      '<yt-live-chat-renderer></yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>',
    )
    Object.defineProperty(doc, 'location', {
      value: { href: 'https://www.youtube.com/live_chat_replay?continuation=video-a' },
      configurable: true,
    })
    const iframe = attachIframeDocument(doc)
    iframe.setAttribute('src', 'https://www.youtube.com/live_chat_replay?continuation=video-a')

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('returns false when iframe src points to another video and document is not ready', () => {
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    document.body.appendChild(iframe)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('returns false for archive when iframe is about:blank even if chat-present attributes exist', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('live-chat-present', '')
    document.body.appendChild(watchFlexy)

    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.setAttribute('src', 'about:blank')
    document.body.appendChild(iframe)

    expect(hasPlayableLiveChat()).toBe(false)
  })

  it('does not let a stale first iframe block current live UI signals', () => {
    const staleIframe = document.createElement('iframe') as HTMLIFrameElement
    staleIframe.id = 'chatframe'
    staleIframe.src = 'https://www.youtube.com/live_chat?v=video-b'
    document.body.appendChild(staleIframe)

    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    document.body.appendChild(watchFlexy)

    const moviePlayer = document.createElement('div') as HTMLElement & {
      getVideoData?: () => { isLive?: boolean; video_id?: string }
    }
    moviePlayer.id = 'movie_player'
    moviePlayer.getVideoData = () => ({ isLive: true, video_id: 'video-a' })
    document.body.appendChild(moviePlayer)

    const chatHost = document.createElement('ytd-live-chat-frame')
    document.body.appendChild(chatHost)
    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    expect(hasPlayableLiveChat()).toBe(true)
  })

  it('returns true for live stream UI signal even when iframe document is not ready', () => {
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    watchFlexy.setAttribute('should-stamp-chat', '')
    document.body.appendChild(watchFlexy)

    const moviePlayer = document.createElement('div') as HTMLElement & {
      getVideoData?: () => { isLive?: boolean; video_id?: string }
    }
    moviePlayer.id = 'movie_player'
    moviePlayer.getVideoData = () => ({ isLive: true, video_id: 'video-a' })
    document.body.appendChild(moviePlayer)

    const chatHost = document.createElement('ytd-live-chat-frame')
    document.body.appendChild(chatHost)

    const timeDisplay = document.createElement('div')
    timeDisplay.className = 'ytp-time-display ytp-live'
    document.body.appendChild(timeDisplay)

    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.setAttribute('video-id', 'video-a')
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    Object.defineProperty(iframe, 'contentDocument', {
      value: null,
      configurable: true,
    })
    chatHost.appendChild(iframe)

    expect(hasPlayableLiveChat()).toBe(true)
  })
})

describe('isArchiveChatPlayable', () => {
  it('returns true when replay iframe has renderer and item list', () => {
    createWatchFlexy('video-a')
    const doc = createLiveChatDoc(
      '<yt-live-chat-renderer></yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>',
    )
    const iframe = attachIframeDocument(doc)

    expect(isArchiveChatPlayable(iframe)).toBe(true)
  })

  it('returns false when iframe is null or about:blank', () => {
    expect(isArchiveChatPlayable(null)).toBe(false)

    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.id = 'chatframe'
    iframe.setAttribute('src', 'about:blank')
    document.body.appendChild(iframe)

    expect(isArchiveChatPlayable(iframe)).toBe(false)
  })
})
