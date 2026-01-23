import { beforeEach, describe, expect, it } from 'vitest'
import { hasPlayableLiveChat } from './hasPlayableLiveChat'

const createLiveChatDoc = (html: string) => {
  const baseDoc = document.implementation.createHTMLDocument('chat')
  baseDoc.body.innerHTML = html
  return {
    body: baseDoc.body,
    querySelector: baseDoc.querySelector.bind(baseDoc),
    location: { href: 'https://www.youtube.com/live_chat' },
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

beforeEach(() => {
  document.body.innerHTML = ''
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

  it('returns true when live chat renderer and item list are present', () => {
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
})
