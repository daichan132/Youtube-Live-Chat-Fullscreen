import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { createChatChromeLease } from './resources/ChatChromeLease'

const createIframeDocument = () => {
  const iframe = document.createElement('iframe')
  document.body.append(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('iframe document unavailable in test')
  return { iframe, doc }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

describe('chat chrome mutation work', () => {
  it('does not invoke selector engines for added text-only elements', async () => {
    const { iframe, doc } = createIframeDocument()
    doc.body.innerHTML = '<yt-live-chat-header-renderer></yt-live-chat-header-renderer><div id="items"></div><div id="input-panel"></div>'
    const items = doc.getElementById('items')
    const elementPrototype = doc.defaultView?.Element.prototype
    if (!items || !elementPrototype) throw new Error('Missing chat fixture elements')
    const lease = createChatChromeLease()
    lease.sync(iframe, 'collapsed')
    const matches = vi.spyOn(elementPrototype, 'matches')
    const query = vi.spyOn(elementPrototype, 'querySelector')

    try {
      for (let batch = 0; batch < 100; batch += 1) {
        const text = doc.createElement('span')
        text.textContent = `message ${batch}`
        items.append(text)
        await Promise.resolve()
      }

      expect(matches).not.toHaveBeenCalled()
      expect(query).not.toHaveBeenCalled()
    } finally {
      lease.release()
    }
  })

  it('does not search the whole chat document or measure chrome for message bursts', async () => {
    const { iframe, doc } = createIframeDocument()
    doc.body.innerHTML = '<yt-live-chat-header-renderer></yt-live-chat-header-renderer><div id="items"></div><div id="input-panel"></div>'
    const header = doc.querySelector<HTMLElement>('yt-live-chat-header-renderer')
    const input = doc.getElementById('input-panel')
    const items = doc.getElementById('items')
    if (!header || !input || !items) throw new Error('Missing chat fixture elements')
    const headerBounds = vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    const inputBounds = vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    const lease = createChatChromeLease()
    lease.sync(iframe, 'collapsed')
    headerBounds.mockClear()
    inputBounds.mockClear()
    const query = vi.spyOn(doc.body, 'querySelector')
    const queryAll = vi.spyOn(doc.body, 'querySelectorAll')

    try {
      for (let batch = 0; batch < 100; batch += 1) {
        const message = doc.createElement('yt-live-chat-text-message-renderer')
        const text = doc.createElement('span')
        text.textContent = `message ${batch}`
        message.append(text)
        items.append(message)
        if (items.children.length > 20) items.firstElementChild?.remove()
        await Promise.resolve()
      }

      expect(query).not.toHaveBeenCalled()
      expect(queryAll).not.toHaveBeenCalled()
      expect(headerBounds).not.toHaveBeenCalled()
      expect(inputBounds).not.toHaveBeenCalled()
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    } finally {
      lease.release()
    }
  })

  it('measures chrome mounted in a new wrapper after collapse', async () => {
    const { iframe, doc } = createIframeDocument()
    const lease = createChatChromeLease()
    lease.sync(iframe, 'collapsed')
    const wrapper = doc.createElement('div')
    const header = doc.createElement('yt-live-chat-header-renderer')
    const input = doc.createElement('div')
    input.id = 'input-panel'
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
    wrapper.append(header, input)

    try {
      doc.body.append(wrapper)
      await Promise.resolve()
      expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('48px')
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    } finally {
      lease.release()
    }
  })

  it('still discovers chrome nested in an added message-list subtree', async () => {
    const { iframe, doc } = createIframeDocument()
    doc.body.innerHTML =
      '<yt-live-chat-header-renderer></yt-live-chat-header-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>'
    const items = doc.querySelector('yt-live-chat-item-list-renderer')
    if (!items) throw new Error('Missing chat fixture list')
    const lease = createChatChromeLease()
    lease.sync(iframe, 'collapsed')
    const wrapper = doc.createElement('div')
    const input = doc.createElement('yt-live-chat-sign-in-prompt-renderer')
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
    wrapper.append(input)

    try {
      items.append(wrapper)
      await Promise.resolve()
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
    } finally {
      lease.release()
    }
  })

  it('remeasures a chrome child change and switches to fallback input after ancestor removal', async () => {
    const { iframe, doc } = createIframeDocument()
    doc.body.innerHTML =
      '<yt-live-chat-header-renderer></yt-live-chat-header-renderer><div id="wrapper"><div id="input-panel"></div></div><yt-live-chat-sign-in-prompt-renderer></yt-live-chat-sign-in-prompt-renderer>'
    const input = doc.getElementById('input-panel')
    const fallback = doc.querySelector<HTMLElement>('yt-live-chat-sign-in-prompt-renderer')
    if (!input || !fallback) throw new Error('Missing input fixture elements')
    const inputBounds = vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    vi.spyOn(fallback, 'getBoundingClientRect').mockReturnValue({ height: 84 } as DOMRect)
    const lease = createChatChromeLease()
    lease.sync(iframe, 'collapsed')

    try {
      inputBounds.mockReturnValue({ height: 96 } as DOMRect)
      input.append(doc.createElement('span'))
      await Promise.resolve()
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('96px')

      doc.getElementById('wrapper')?.remove()
      await Promise.resolve()
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(fallback.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('84px')
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    } finally {
      lease.release()
    }
  })
})
