import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { type ChatChromeLease, createChatChromeLease } from './resources/ChatChromeLease'

const leases: ChatChromeLease[] = []

const createChat = () => {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('iframe document unavailable in test')
  const lease = createChatChromeLease()
  leases.push(lease)
  return { iframe, doc, lease }
}

const giveHeight = (element: HTMLElement, height: number) =>
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect)

const measuredHeight = (element: HTMLElement) => element.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const lease of leases.splice(0)) lease.release()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('chat-only chrome mutation filtering', () => {
  it('keeps message updates independent of full-body chrome searches and layout measurements', async () => {
    const { iframe, doc, lease } = createChat()
    const header = doc.createElement('yt-live-chat-header-renderer')
    const input = doc.createElement('div')
    input.id = 'input-panel'
    const messages = doc.createElement('yt-live-chat-item-list-renderer')
    doc.body.append(header, input, messages)
    const headerRect = giveHeight(header, 48)
    const inputRect = giveHeight(input, 64)
    lease.sync(iframe, 'collapsed')
    const queryOne = vi.spyOn(doc.body, 'querySelector')
    const queryAll = vi.spyOn(doc.body, 'querySelectorAll')
    headerRect.mockClear()
    inputRect.mockClear()

    // Separate deliveries model a stream rather than one coalesced mutation.
    for (let batch = 0; batch < 20; batch += 1) {
      const fragment = doc.createDocumentFragment()
      for (let index = 0; index < 20; index += 1) {
        const message = doc.createElement('yt-live-chat-text-message-renderer')
        message.textContent = `Message ${batch * 20 + index}`
        fragment.appendChild(message)
      }
      messages.appendChild(fragment)
      messages.firstElementChild?.remove()
      if (messages.lastElementChild) messages.lastElementChild.textContent = 'Updated message'
      await Promise.resolve()
    }

    expect(messages.children).toHaveLength(380)
    expect(queryOne).not.toHaveBeenCalled()
    expect(queryAll).not.toHaveBeenCalled()
    expect(headerRect).not.toHaveBeenCalled()
    expect(inputRect).not.toHaveBeenCalled()
    expect(measuredHeight(header)).toBe('48px')
    expect(measuredHeight(input)).toBe('64px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('remeasures content changes inside the current chrome elements', async () => {
    const { iframe, doc, lease } = createChat()
    const input = doc.createElement('div')
    input.id = 'input-panel'
    const content = doc.createElement('span')
    input.appendChild(content)
    doc.body.appendChild(input)
    const rect = giveHeight(input, 64)
    lease.sync(iframe, 'collapsed')

    rect.mockReturnValue({ height: 80 } as DOMRect)
    content.textContent = 'Additional input notice'
    await Promise.resolve()

    expect(measuredHeight(input)).toBe('80px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('discovers chrome added inside wrappers and clears measurements of removed subtrees', async () => {
    const { iframe, doc, lease } = createChat()
    const wrapper = doc.createElement('div')
    const header = doc.createElement('yt-live-chat-header-renderer')
    const input = doc.createElement('div')
    input.id = 'input-panel'
    wrapper.append(header, input)
    doc.body.appendChild(wrapper)
    giveHeight(header, 48)
    giveHeight(input, 64)
    lease.sync(iframe, 'collapsed')

    const replacement = doc.createElement('section')
    const nextHeader = doc.createElement('yt-live-chat-header-renderer')
    const nextInput = doc.createElement('div')
    nextInput.id = 'input-panel'
    replacement.append(nextHeader, nextInput)
    giveHeight(nextHeader, 56)
    giveHeight(nextInput, 72)
    wrapper.replaceWith(replacement)
    await Promise.resolve()

    expect(measuredHeight(header)).toBe('')
    expect(measuredHeight(input)).toBe('')
    expect(measuredHeight(nextHeader)).toBe('56px')
    expect(measuredHeight(nextInput)).toBe('72px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('tracks outermost fallback changes and gives a late input panel priority', async () => {
    const { iframe, doc, lease } = createChat()
    lease.sync(iframe, 'collapsed')
    const wrapper = doc.createElement('section')
    const outer = doc.createElement('yt-live-chat-message-input-renderer')
    const inner = doc.createElement('yt-live-chat-sign-in-prompt-renderer')
    outer.appendChild(inner)
    wrapper.appendChild(outer)
    giveHeight(outer, 64)
    giveHeight(inner, 40)
    doc.body.appendChild(wrapper)
    await Promise.resolve()

    expect(measuredHeight(outer)).toBe('64px')
    expect(measuredHeight(inner)).toBe('')

    outer.replaceWith(inner)
    await Promise.resolve()
    expect(measuredHeight(outer)).toBe('')
    expect(measuredHeight(inner)).toBe('40px')

    const input = doc.createElement('div')
    input.id = 'input-panel'
    giveHeight(input, 72)
    doc.body.appendChild(input)
    await Promise.resolve()
    expect(measuredHeight(inner)).toBe('')
    expect(measuredHeight(input)).toBe('72px')

    input.remove()
    await Promise.resolve()
    expect(measuredHeight(input)).toBe('')
    expect(measuredHeight(inner)).toBe('40px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('tracks input panels gaining and losing their id without replacing nodes', async () => {
    const { iframe, doc, lease } = createChat()
    const input = doc.createElement('div')
    const fallback = doc.createElement('yt-live-chat-sign-in-prompt-renderer')
    const messages = doc.createElement('yt-live-chat-item-list-renderer')
    input.appendChild(fallback)
    doc.body.append(input, messages)
    giveHeight(input, 72)
    giveHeight(fallback, 40)
    lease.sync(iframe, 'collapsed')

    expect(measuredHeight(input)).toBe('')
    expect(measuredHeight(fallback)).toBe('40px')

    input.id = 'input-panel'
    messages.appendChild(doc.createElement('yt-live-chat-text-message-renderer'))
    await Promise.resolve()

    expect(measuredHeight(input)).toBe('72px')
    expect(measuredHeight(fallback)).toBe('')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    input.removeAttribute('id')
    messages.appendChild(doc.createElement('yt-live-chat-text-message-renderer'))
    await Promise.resolve()

    expect(measuredHeight(input)).toBe('')
    expect(measuredHeight(fallback)).toBe('40px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    lease.release()
    expect(measuredHeight(input)).toBe('')
    expect(measuredHeight(fallback)).toBe('')
  })

  it('ignores unrelated message id updates without searching or measuring chrome', async () => {
    const { iframe, doc, lease } = createChat()
    const input = doc.createElement('div')
    input.id = 'input-panel'
    const message = doc.createElement('yt-live-chat-text-message-renderer')
    doc.body.append(input, message)
    const inputRect = giveHeight(input, 64)
    const bodyRect = vi.spyOn(doc.body, 'getBoundingClientRect')
    lease.sync(iframe, 'collapsed')
    const queryOne = vi.spyOn(doc.body, 'querySelector')
    const queryAll = vi.spyOn(doc.body, 'querySelectorAll')
    inputRect.mockClear()
    bodyRect.mockClear()

    for (let index = 0; index < 20; index += 1) {
      message.id = `message-${index}`
      await Promise.resolve()
    }

    expect(queryOne).not.toHaveBeenCalled()
    expect(queryAll).not.toHaveBeenCalled()
    expect(inputRect).not.toHaveBeenCalled()
    expect(bodyRect).not.toHaveBeenCalled()
    expect(measuredHeight(input)).toBe('64px')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('binds a replaced iframe body and stops observing the old body', async () => {
    const { iframe, doc, lease } = createChat()
    const oldBody = doc.body
    const oldInput = doc.createElement('div')
    oldInput.id = 'input-panel'
    oldBody.appendChild(oldInput)
    giveHeight(oldInput, 64)
    lease.sync(iframe, 'collapsed')

    const nextBody = doc.createElement('body')
    const input = doc.createElement('div')
    input.id = 'input-panel'
    nextBody.appendChild(input)
    const rect = giveHeight(input, 72)
    oldBody.replaceWith(nextBody)
    lease.sync(iframe, 'collapsed')
    rect.mockClear()
    oldInput.appendChild(doc.createElement('span'))
    await Promise.resolve()

    expect(oldBody).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(measuredHeight(oldInput)).toBe('')
    expect(measuredHeight(input)).toBe('72px')
    expect(rect).not.toHaveBeenCalled()
    expect(nextBody).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })
})
