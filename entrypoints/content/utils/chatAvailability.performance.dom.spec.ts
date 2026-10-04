import { describe, expect, it, vi } from 'vitest'
import { isLiveChatUnavailable } from './hasPlayableLiveChat'

const unavailablePhrases = ['Live chat replay is not available', 'Chat is disabled', 'Live chat is disabled']

const createChatDocument = (html: string) => {
  const doc = document.implementation.createHTMLDocument('chat')
  doc.body.innerHTML = html
  return doc
}

describe('chat availability observation', () => {
  it.each(unavailablePhrases)('keeps a normal chat available when a viewer writes %s', phrase => {
    const doc = createChatDocument(`
      <yt-live-chat-renderer>
        <yt-live-chat-item-list-renderer>
          <yt-live-chat-text-message-renderer>${phrase}</yt-live-chat-text-message-renderer>
        </yt-live-chat-item-list-renderer>
      </yt-live-chat-renderer>
    `)

    expect(isLiveChatUnavailable(doc)).toBe(false)
  })

  it.each(unavailablePhrases)('keeps a normal chat available when a system message contains %s', phrase => {
    const doc = createChatDocument(`
      <yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>
      <yt-live-chat-message-renderer>${phrase}</yt-live-chat-message-renderer>
    `)

    expect(isLiveChatUnavailable(doc)).toBe(false)
  })

  it.each(unavailablePhrases)('preserves the body error fallback while a chat renderer is still loading for %s', phrase => {
    const doc = createChatDocument(`<yt-live-chat-renderer></yt-live-chat-renderer><div>${phrase}</div>`)

    expect(isLiveChatUnavailable(doc)).toBe(true)
  })

  it('does not read the accumulated chat body text during repeated observations', () => {
    const doc = createChatDocument(
      '<yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>',
    )
    const list = doc.querySelector('yt-live-chat-item-list-renderer')
    if (!list) throw new Error('Missing message list')
    for (let index = 0; index < 1000; index += 1) {
      const message = doc.createElement('yt-live-chat-text-message-renderer')
      message.textContent = `Viewer message ${index}`
      list.append(message)
    }
    const bodyText = vi.spyOn(doc.body, 'textContent', 'get')

    for (let index = 0; index < 100; index += 1) expect(isLiveChatUnavailable(doc)).toBe(false)

    expect(bodyText).not.toHaveBeenCalled()
  })

  it('still recognizes an unavailable renderer beside a normal chat renderer', () => {
    const doc = createChatDocument(`
      <yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>
      <yt-live-chat-unavailable-message-renderer>Localized unavailable message</yt-live-chat-unavailable-message-renderer>
    `)

    expect(isLiveChatUnavailable(doc)).toBe(true)
  })

  it('still recognizes a localized structural unavailable message without a normal renderer', () => {
    const doc = createChatDocument('<yt-live-chat-message-renderer>チャットは利用できません</yt-live-chat-message-renderer>')

    expect(isLiveChatUnavailable(doc)).toBe(true)
  })

  it.each(unavailablePhrases)('preserves the plain body error fallback for %s', phrase => {
    const doc = createChatDocument(phrase)

    expect(isLiveChatUnavailable(doc)).toBe(true)
  })
})
