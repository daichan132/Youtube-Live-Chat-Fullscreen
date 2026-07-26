import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { createChatOnlyChromeController } from './chatOnlyChrome'

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
    const controller = createChatOnlyChromeController()

    controller.sync(iframe, 'collapsed')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('48px')

    controller.sync(iframe, 'expanded')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    vi.runAllTimers()
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)

    controller.dispose()
  })

  it('cleans the old iframe document when the lease changes', () => {
    const first = document.createElement('iframe')
    const second = document.createElement('iframe')
    document.body.append(first, second)
    const controller = createChatOnlyChromeController()

    controller.sync(first, 'collapsed')
    expect(first.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    controller.sync(second, 'collapsed')
    expect(first.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(second.contentDocument?.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)

    controller.dispose()
  })

  it('measures a current signed-out input panel mounted after collapse', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    iframeDocument.body.appendChild(header)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    const controller = createChatOnlyChromeController()

    controller.sync(iframe, 'collapsed')

    const input = iframeDocument.createElement('div')
    input.id = 'input-panel'
    input.appendChild(iframeDocument.createElement('yt-live-chat-message-renderer'))
    vi.spyOn(input, 'getBoundingClientRect').mockReturnValue({ height: 64 } as DOMRect)
    iframeDocument.body.appendChild(input)
    await Promise.resolve()

    expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('64px')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    controller.dispose()
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
    const controller = createChatOnlyChromeController()
    controller.sync(iframe, 'collapsed')

    const replacement = iframeDocument.createElement('div')
    replacement.id = 'input-panel'
    vi.spyOn(replacement, 'getBoundingClientRect').mockReturnValue({ height: 72 } as DOMRect)
    input.replaceWith(replacement)
    await Promise.resolve()

    expect(input.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(replacement.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('72px')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(true)
    controller.dispose()
  })

  it('disconnects its iframe observer and clears measurements on cleanup', () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) throw new Error('iframe document unavailable in test')
    const header = iframeDocument.createElement('yt-live-chat-header-renderer')
    iframeDocument.body.appendChild(header)
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ height: 48 } as DOMRect)
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const controller = createChatOnlyChromeController()

    controller.sync(iframe, 'collapsed')
    controller.sync(iframe, 'inactive')

    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(iframeDocument.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    controller.dispose()
  })
})
