import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_PURCHASE_ACTIVE_CLASS,
} from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { hasOpenChatPurchaseUI } from '../chat/shared/chatPurchaseActivity'
import { createChatChromeLease } from '../runtime/resources/ChatChromeLease'
import { useChatPurchaseActivity } from './useChatPurchaseActivity'

const disposals: Array<() => void> = []
const settleMutations = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}
const createCarrier = () => {
  const carrier = document.createElement('div')
  const iframe = document.createElement('iframe')
  document.body.append(carrier)
  carrier.append(iframe)
  const body = iframe.contentDocument?.body
  if (!body) throw new Error('Missing native chat body')
  disposals.push(() => carrier.remove())
  return { carrier, iframe, body }
}
const mountPdpFlow = (body: HTMLElement) => {
  const root = body.ownerDocument.createElement('ytd-flow-root-renderer')
  // Structure observed in the native Buy Jewels page; main content and the
  // bottom purchase bar each have their own PDP host.
  root.innerHTML = `<div id="flow-step"><ytd-flow-step-renderer enable-scrolling-fix fit-content bottom-bar>
    <tp-yt-paper-dialog-scrollable id="scroller"><div id="content">
      <pdp-view-model class="ytPdpViewModelInternalScrolling ytPdpViewModelForceSingleColumn" data-main-pdp></pdp-view-model>
    </div></tp-yt-paper-dialog-scrollable>
    <div id="bottom-bar"><pdp-view-model class="ytPdpViewModelUseBottomBarLayout" data-footer-pdp></pdp-view-model></div>
  </ytd-flow-step-renderer></div>`
  const main = root.querySelector<HTMLElement>('[data-main-pdp]')
  const footer = root.querySelector<HTMLElement>('[data-footer-pdp]')
  if (!main || !footer) throw new Error('Missing native PDP hosts')
  const mainRect = vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 400 } as DOMRect)
  vi.spyOn(footer, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 64 } as DOMRect)
  body.append(root)
  return { root, main, footer, mainRect }
}

afterEach(() => {
  for (const dispose of disposals.splice(0).reverse()) dispose()
})

describe('native PDP purchase presentation', () => {
  it('keeps a visible Buy Jewels page active and prevents chat-only collapse', () => {
    const { carrier, iframe, body } = createCarrier()
    mountPdpFlow(body)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    const chrome = createChatChromeLease()
    disposals.push(() => chrome.release())

    chrome.sync(iframe, 'collapsed')

    expect(hasOpenChatPurchaseUI(body)).toBe(true)
    expect(onChange).toHaveBeenLastCalledWith(true)
    expect(body).toHaveClass(IFRAME_PURCHASE_ACTIVE_CLASS)
    expect(body).not.toHaveClass(IFRAME_CHAT_ONLY_CLASS)
  })

  it('continues activity when gift collection is replaced by the native PDP flow', async () => {
    const { carrier, body } = createCarrier()
    const collection = body.ownerDocument.createElement('yt-pdg-gift-collection-view-model')
    vi.spyOn(collection, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 400 } as DOMRect)
    body.append(collection)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    onChange.mockClear()

    act(() => {
      collection.remove()
      mountPdpFlow(body)
    })
    await settleMutations()

    expect(hasOpenChatPurchaseUI(body)).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps a visible footer active until both native PDP hosts are hidden', async () => {
    const { carrier, body } = createCarrier()
    const { main, footer } = mountPdpFlow(body)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    onChange.mockClear()

    main.hidden = true
    await settleMutations()
    expect(hasOpenChatPurchaseUI(body)).toBe(true)
    expect(onChange).not.toHaveBeenCalled()

    footer.hidden = true
    await settleMutations()
    expect(onChange.mock.calls).toEqual([[false]])
  })

  it.each(['hidden-parent', 'zero-size'])('ignores a retained PDP page with %s', kind => {
    const { carrier, body } = createCarrier()
    const { root, footer, mainRect } = mountPdpFlow(body)
    if (kind === 'hidden-parent') root.hidden = true
    else {
      mainRect.mockReturnValue({ width: 0, height: 0 } as DOMRect)
      footer.hidden = true
    }
    const onChange = vi.fn()

    renderHook(() => useChatPurchaseActivity(carrier, onChange))

    expect(hasOpenChatPurchaseUI(body)).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('does not activate for generic flow containers or a gift announcement', () => {
    const { carrier, body } = createCarrier()
    body.innerHTML = `<ytd-flow-root-renderer><div id="flow-step"><ytd-flow-step-renderer></ytd-flow-step-renderer></div></ytd-flow-root-renderer>
      <yt-gift-message-view-model><div id="content"><yt-attributed-string id="message-v2">Gift sent</yt-attributed-string></div></yt-gift-message-view-model>`
    const onChange = vi.fn()

    renderHook(() => useChatPurchaseActivity(carrier, onChange))

    expect(hasOpenChatPurchaseUI(body)).toBe(false)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })
})
