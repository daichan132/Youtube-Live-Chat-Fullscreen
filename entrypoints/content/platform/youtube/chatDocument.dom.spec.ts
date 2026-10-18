import { describe, expect, it } from 'vitest'
import { getLiveChatDocument, observeLiveChatDocument } from './chatDocument'

describe('chat document access', () => {
  it('returns the loaded document without replacing it', () => {
    const iframe = document.createElement('iframe')
    const doc = new Proxy(document.implementation.createHTMLDocument('chat'), {
      get(target, key) {
        if (key === 'location') return { href: 'https://www.youtube.com/live_chat_replay?v=current' }
        return Reflect.get(target, key, target)
      },
    })
    Object.defineProperty(iframe, 'contentDocument', { value: doc })

    expect(getLiveChatDocument(iframe)).toBe(doc)
  })

  it.each([null, { location: { href: 'about:blank' } }, { location: null }])('waits for an accessible, loaded document: %j', doc => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', { value: doc })

    expect(getLiveChatDocument(iframe)).toBeNull()
  })

  it('tolerates inaccessible documents during replacement', () => {
    const iframe = document.createElement('iframe')
    Object.defineProperty(iframe, 'contentDocument', {
      get() {
        throw new DOMException('Access denied', 'SecurityError')
      },
    })

    expect(getLiveChatDocument(iframe)).toBeNull()
  })

  it('keeps a loading chat pending when its system message is informational', () => {
    const doc = document.implementation.createHTMLDocument('chat')
    doc.body.innerHTML = `
      <yt-live-chat-renderer></yt-live-chat-renderer>
      <yt-live-chat-message-renderer>Welcome message</yt-live-chat-message-renderer>
    `

    expect(observeLiveChatDocument(doc)).toEqual({ ready: false, unavailable: false })
  })
})
