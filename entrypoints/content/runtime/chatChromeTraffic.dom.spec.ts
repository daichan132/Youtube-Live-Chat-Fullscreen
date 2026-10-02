import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR } from '../features/YTDLiveChatIframe/constants/styleContract'
import { createChatChromeLease } from './resources/ChatChromeLease'

const setupChat = () => {
  const iframe = document.createElement('iframe')
  document.body.append(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('Chat document unavailable')
  doc.body.innerHTML = `
    <yt-live-chat-header-renderer>Chat</yt-live-chat-header-renderer>
    <yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>
    <div id="input-panel">Input</div>
  `
  const header = doc.querySelector<HTMLElement>('yt-live-chat-header-renderer')
  const input = doc.getElementById('input-panel')
  const messages = doc.querySelector('yt-live-chat-item-list-renderer')
  if (!header || !input || !messages) throw new Error('Chat targets unavailable')
  const headerRect = vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
  const inputRect = vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
  const controller = createChatChromeLease()
  controller.sync(iframe, 'collapsed')
  headerRect.mockClear()
  inputRect.mockClear()
  const discovery = vi.spyOn(doc.body, 'querySelector')
  return { iframe, doc, header, input, messages, headerRect, inputRect, discovery, controller }
}

describe('chat chrome traffic', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  it('does no body discovery or chrome layout reads for 6,000 message updates', async () => {
    const { doc, messages, discovery, headerRect, inputRect, controller } = setupChat()
    if (!doc.defaultView) throw new Error('Chat window unavailable')
    const subtreeDiscovery = vi.spyOn(doc.defaultView.Element.prototype, 'querySelector')
    try {
      for (let batch = 0; batch < 120; batch++) {
        const fragment = doc.createDocumentFragment()
        for (let index = 0; index < 50; index++) {
          const message = doc.createElement('yt-live-chat-text-message-renderer')
          message.innerHTML = '<span>Author</span><span>Message</span>'
          fragment.append(message)
        }
        messages.replaceChildren(fragment)
        await Promise.resolve()
        vi.advanceTimersToNextFrame()
      }
      expect(discovery).not.toHaveBeenCalled()
      expect(subtreeDiscovery).not.toHaveBeenCalled()
      expect(headerRect).not.toHaveBeenCalled()
      expect(inputRect).not.toHaveBeenCalled()
    } finally {
      controller.release()
    }
  })

  it('measures once per frame after a burst', async () => {
    const { input, inputRect, headerRect, discovery, controller } = setupChat()
    try {
      for (let index = 0; index < 40; index++) {
        input.replaceChildren(input.ownerDocument.createTextNode(String(index)))
        await Promise.resolve()
      }
      expect(inputRect).not.toHaveBeenCalled()
      inputRect.mockReturnValue({ height: 72 } as DOMRect)
      vi.advanceTimersToNextFrame()
      expect(discovery).toHaveBeenCalledTimes(2)
      expect(headerRect).toHaveBeenCalledTimes(1)
      expect(inputRect).toHaveBeenCalledTimes(1)
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
    } finally {
      controller.release()
    }
  })

  it('remeasures when existing input text changes', async () => {
    const { input, inputRect, controller } = setupChat()
    try {
      if (!input.firstChild) throw new Error('Input text unavailable')
      input.firstChild.textContent = 'A longer participation notice'
      await Promise.resolve()
      inputRect.mockReturnValue({ height: 96 } as DOMRect)
      vi.advanceTimersToNextFrame()
      expect(inputRect).toHaveBeenCalledTimes(1)
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('96px')
    } finally {
      controller.release()
    }
  })

  it('discovers chrome inside replaced wrappers from the iframe realm', async () => {
    const { doc, input, controller } = setupChat()
    try {
      const wrapper = doc.createElement('section')
      wrapper.innerHTML = '<div id="input-panel">Replacement</div>'
      const replacement = wrapper.firstElementChild as HTMLElement
      vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue({ height: 80 } as DOMRect)
      input.replaceWith(wrapper)
      await Promise.resolve()
      vi.advanceTimersToNextFrame()
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('80px')
    } finally {
      controller.release()
    }
  })

  it.each(['inactive', 'expanded', 'replacement', 'release'] as const)('cancels pending measurement on %s', async action => {
    const { iframe, doc, input, inputRect, controller } = setupChat()
    input.append(doc.createElement('span'))
    await Promise.resolve()
    if (action === 'replacement') {
      const replacement = document.createElement('iframe')
      document.body.append(replacement)
      controller.sync(replacement, 'collapsed')
    } else if (action === 'release') controller.release()
    else controller.sync(iframe, action)
    inputRect.mockClear()
    vi.advanceTimersToNextFrame()
    expect(inputRect).not.toHaveBeenCalled()
    controller.release()
  })
})
