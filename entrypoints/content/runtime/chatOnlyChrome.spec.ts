import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { createChatChromeLease } from './resources/ChatChromeLease'

const createMeasuredChromeFixture = () => {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('iframe document unavailable in test')
  const header = doc.createElement('yt-live-chat-header-renderer')
  const input = doc.createElement('div')
  input.id = 'input-panel'
  doc.body.append(header, input)
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
  vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
  const replacement = doc.createElement('div')
  replacement.id = 'input-panel'
  vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
  return { iframe, doc, header, input, replacement, controller: createChatChromeLease() }
}

describe('chatOnlyChrome', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('collapses and expands iframe chrome without exposing the iframe to React', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    const input = iframeDocument.createElement('div')
    input.id = 'input-panel'
    iframeDocument.body.append(header, input)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    const controller = createChatChromeLease()

    controller.sync(iframe, 'collapsed')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('48px')

    controller.sync(iframe, 'expanded')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    vi.runAllTimers()
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)

    controller.release()
  })

  it('cleans the old iframe document when the lease changes', () => {
    const first = document.createElement('iframe')
    const second = document.createElement('iframe')
    document.body.append(first, second)
    const controller = createChatChromeLease()

    controller.sync(first, 'collapsed')
    expect(first.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    controller.sync(second, 'collapsed')
    expect(first.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(second.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    controller.release()
  })

  it('measures a current signed-out input panel mounted after collapse', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    iframeDocument.body.appendChild(header)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    const controller = createChatChromeLease()

    controller.sync(iframe, 'collapsed')

    const input = iframeDocument.createElement('div')
    input.id = 'input-panel'
    input.appendChild(iframeDocument.createElement('yt-live-chat-message-renderer'))
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    iframeDocument.body.appendChild(input)
    await Promise.resolve()

    expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('64px')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    controller.release()
  })

  it('remeasures a replaced input target while remaining collapsed', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    const input = iframeDocument.createElement('div')
    input.id = 'input-panel'
    iframeDocument.body.append(header, input)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    const controller = createChatChromeLease()
    controller.sync(iframe, 'collapsed')

    const replacement = iframeDocument.createElement('div')
    replacement.id = 'input-panel'
    vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
    input.replaceWith(replacement)
    await Promise.resolve()

    expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    controller.release()
  })

  it.each(['settle', 'release'] as const)('clears replaced input measurements when expanding before observation, then %s', async ending => {
    const { iframe, doc, header, input, replacement, controller } = createMeasuredChromeFixture()
    try {
      controller.sync(iframe, 'collapsed')
      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('64px')
      input.replaceWith(replacement)
      // Expand in the same turn, before MutationObserver can clean the old target.
      controller.sync(iframe, 'expanded')
      expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')

      if (ending === 'settle') vi.runAllTimers()
      else controller.release()
      await Promise.resolve()

      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    } finally {
      controller.release()
      iframe.remove()
    }
  })

  it('clears a replaced input when collapse restarts before expansion settles', async () => {
    const { iframe, doc, header, input, replacement, controller } = createMeasuredChromeFixture()
    try {
      controller.sync(iframe, 'collapsed')
      controller.sync(iframe, 'expanded')
      input.replaceWith(replacement)
      controller.sync(iframe, 'collapsed')
      vi.runAllTimers()
      await Promise.resolve()

      expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
      expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('48px')
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
      expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)

      controller.release()
      expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
      expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    } finally {
      controller.release()
      iframe.remove()
    }
  })

  it('clears collapsed chrome and releases its remaining purchase observer on cleanup', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    iframeDocument.body.appendChild(header)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const controller = createChatChromeLease()

    controller.sync(iframe, 'collapsed')
    controller.sync(iframe, 'inactive')

    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    controller.release()
    expect(disconnect).toHaveBeenCalledTimes(2)
  })
})
