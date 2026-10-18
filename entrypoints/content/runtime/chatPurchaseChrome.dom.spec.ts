import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MODE_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
  IFRAME_PURCHASE_ACTIVE_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { createChatChromeLease, hasOpenChatPurchaseUI, observeChatPurchaseUI } from './resources/ChatChromeLease'

const disposals: Array<() => void> = []
const settleMutation = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createFixture = () => {
  const iframe = document.createElement('iframe')
  document.body.append(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('Missing iframe document')
  const header = doc.createElement('yt-live-chat-header-renderer')
  const inputPanel = doc.createElement('div')
  inputPanel.id = 'input-panel'
  const input = doc.createElement('yt-live-chat-message-input-renderer')
  inputPanel.append(input)
  const panelPages = doc.createElement('div')
  panelPages.id = 'panel-pages'
  doc.body.append(header, panelPages, inputPanel)
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 56 } as DOMRect)
  vi.spyOn(inputPanel, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 72 } as DOMRect)
  const controller = createChatChromeLease()
  disposals.push(() => {
    controller.release()
    iframe.remove()
  })
  const mountPanel = (tag = 'yt-live-chat-message-buy-flow-renderer') => {
    const panel = doc.createElement(tag)
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 400 } as DOMRect)
    panelPages.append(panel)
    return panel
  }
  return { iframe, doc, header, inputPanel, input, panelPages, controller, mountPanel }
}

describe('native purchase chrome protection', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    for (const dispose of disposals.splice(0)) dispose()
    vi.useRealTimers()
  })

  it('keeps a focused native purchase input expanded when hover requests collapse, then resumes after closing', async () => {
    const { iframe, doc, input, controller } = createFixture()
    input.setAttribute('product-picker-open', '')
    const amount = doc.createElement('input')
    input.append(amount)
    amount.focus()
    const blur = vi.spyOn(amount, 'blur')

    controller.sync(iframe, 'collapsed')

    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)
    expect(doc.body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    expect(doc.activeElement).toBe(amount)
    expect(blur).not.toHaveBeenCalled()

    input.removeAttribute('product-picker-open')
    await settleMutation()

    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)
    expect(doc.activeElement).not.toBe(amount)
    expect(blur).toHaveBeenCalledOnce()
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
  })

  it('protects the native product picker opened from a restricted-participation composer', async () => {
    const { iframe, doc, input, controller } = createFixture()
    const restricted = doc.createElement('yt-live-chat-restricted-participation-renderer')
    restricted.setAttribute('product-picker-open', '')
    input.replaceWith(restricted)
    controller.sync(iframe, 'collapsed')

    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)

    restricted.removeAttribute('product-picker-open')
    await settleMutation()
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
  })

  it('owns the active marker in full-chat mode and clears it when the iframe is released', async () => {
    const { iframe, doc, controller, mountPanel } = createFixture()
    const offer = mountPanel()
    controller.sync(iframe, 'inactive')
    expect(doc.body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)

    offer.hidden = true
    await settleMutation()
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    offer.hidden = false
    await settleMutation()
    expect(doc.body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)

    controller.sync(null, 'inactive')
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    offer.hidden = true
    await settleMutation()
    offer.hidden = false
    await settleMutation()
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
  })

  it('cleans the active marker from the previous iframe body when binding changes', () => {
    const previous = createFixture()
    previous.mountPanel()
    previous.controller.sync(previous.iframe, 'inactive')
    expect(previous.doc.body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    const next = createFixture()

    previous.controller.sync(next.iframe, 'inactive')

    expect(previous.doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    expect(next.doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
  })

  it('reopens already-collapsed chrome when the native picker attribute changes without another runtime sync', async () => {
    const { iframe, doc, input, controller } = createFixture()
    const nativeStyle = doc.createElement('style')
    nativeStyle.textContent = '.chat-only-display #input-panel { opacity: 0; height: 0; overflow: hidden; }'
    doc.head.append(nativeStyle)
    controller.sync(iframe, 'collapsed')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)

    input.setAttribute('product-picker-open', '')
    await settleMutation()

    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)
    vi.runAllTimers()
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
  })

  it('does not treat an active picker in a natively hidden input as an open offer', async () => {
    const { iframe, doc, input, inputPanel, controller } = createFixture()
    input.setAttribute('product-picker-open', '')
    inputPanel.hidden = true
    controller.sync(iframe, 'collapsed')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    inputPanel.hidden = false
    await settleMutation()
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it.each([
    'yt-live-chat-message-buy-flow-renderer',
    'yt-live-chat-super-sticker-preview-renderer',
    'ytd-sponsorships-gift-offer-renderer',
    'yt-pdg-gift-collection-view-model',
  ])('keeps rendered %s available even without a product-picker attribute', async tag => {
    const { iframe, doc, controller, mountPanel } = createFixture()
    controller.sync(iframe, 'collapsed')
    const panel = mountPanel(tag)
    await settleMutation()

    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    panel.remove()
    await settleMutation()
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it.each(['hidden', 'aria-hidden', 'display', 'visibility', 'opacity', 'inert'] as const)(
    'ignores a retained purchase panel whose ancestor is hidden by %s',
    async kind => {
      const { iframe, doc, panelPages, controller, mountPanel } = createFixture()
      mountPanel()
      if (kind === 'hidden') panelPages.hidden = true
      else if (kind === 'aria-hidden') panelPages.setAttribute('aria-hidden', 'true')
      else if (kind === 'inert') panelPages.setAttribute('inert', '')
      else if (kind === 'display') panelPages.style.display = 'none'
      else if (kind === 'visibility') panelPages.style.visibility = 'hidden'
      else panelPages.style.opacity = '0'
      controller.sync(iframe, 'collapsed')

      expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)

      panelPages.removeAttribute('hidden')
      panelPages.removeAttribute('aria-hidden')
      panelPages.removeAttribute('inert')
      panelPages.removeAttribute('style')
      await settleMutation()
      expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    },
  )

  it('ignores zero-size retained offers and ordinary paid chat messages', () => {
    const { iframe, doc, panelPages, controller } = createFixture()
    panelPages.innerHTML = '<yt-live-chat-message-buy-flow-renderer></yt-live-chat-message-buy-flow-renderer>'
    const paidMessage = doc.createElement('yt-live-chat-paid-message-renderer')
    vi.spyOn(paidMessage, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 100 } as DOMRect)
    doc.body.append(paidMessage)

    controller.sync(iframe, 'collapsed')

    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(hasOpenChatPurchaseUI(doc.body)).toBe(false)
  })

  it('does not infer a purchase from initial loading, but keeps an open offer stable through native loading', async () => {
    const { iframe, doc, controller, mountPanel } = createFixture()
    const loading = mountPanel('div')
    loading.id = 'loading'
    loading.className = 'yt-live-chat-renderer'
    controller.sync(iframe, 'collapsed')
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    loading.hidden = true
    const offer = mountPanel()
    await settleMutation()
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    offer.remove()
    loading.hidden = false
    // A new hover signal before MutationObserver delivery must not blur/collapse.
    controller.sync(iframe, 'collapsed')
    await settleMutation()
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)

    loading.hidden = true
    await settleMutation()
    expect(doc.body).toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('emits only initial state and changes, and stops observing after disposal', async () => {
    const { input, doc } = createFixture()
    const changed = vi.fn()
    const stop = observeChatPurchaseUI(doc.body, changed)
    input.setAttribute('product-picker-open', '')
    await settleMutation()
    input.setAttribute('data-unrelated', 'changed')
    doc.body.append(doc.createElement('yt-live-chat-text-message-renderer'))
    await settleMutation()
    input.removeAttribute('product-picker-open')
    await settleMutation()

    expect(changed.mock.calls).toEqual([[false], [true], [false]])

    stop()
    input.setAttribute('product-picker-open', '')
    await settleMutation()
    expect(changed).toHaveBeenCalledTimes(3)
  })

  it('does not mutate the lease-owned marker when observation is used on its own', async () => {
    const { doc, mountPanel } = createFixture()
    const offer = mountPanel()
    const changed = vi.fn()
    const stop = observeChatPurchaseUI(doc.body, changed)
    expect(changed).toHaveBeenLastCalledWith(true)
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    offer.hidden = true
    await settleMutation()
    stop()
    expect(changed).toHaveBeenLastCalledWith(false)
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
  })

  it('releases measurements and observers while an offer is open without retaining expansion ownership', async () => {
    const { iframe, doc, header, inputPanel, controller, mountPanel } = createFixture()
    controller.sync(iframe, 'collapsed')
    const offer = mountPanel()
    await settleMutation()
    controller.release()
    offer.remove()
    await settleMutation()
    vi.runAllTimers()

    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_MODE_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_CHAT_ONLY_TRANSITION_CLASS)
    expect(doc.body).not.toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(inputPanel.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
  })
})
