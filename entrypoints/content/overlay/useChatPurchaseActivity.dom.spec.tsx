import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatPurchaseActivity } from './useChatPurchaseActivity'

const ownedElements: HTMLElement[] = []
const settleMutation = async () => {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}
const createCarrier = () => {
  const carrier = document.createElement('div')
  document.body.append(carrier)
  ownedElements.push(carrier)
  const iframe = document.createElement('iframe')
  carrier.append(iframe)
  const body = iframe.contentDocument?.body
  if (!body) throw new Error('Missing native chat document')
  return { carrier, iframe, body }
}
const mountNativeOffer = (body: HTMLElement) => {
  const offer = body.ownerDocument.createElement('ytd-sponsorships-gift-offer-renderer')
  vi.spyOn(offer, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 400 } as DOMRect)
  body.append(offer)
  return offer
}
const mountNativeLoading = (body: HTMLElement) => {
  const panelPages = body.ownerDocument.createElement('div')
  panelPages.id = 'panel-pages'
  const loading = body.ownerDocument.createElement('div')
  loading.id = 'loading'
  loading.className = 'yt-live-chat-renderer'
  vi.spyOn(loading, 'getBoundingClientRect').mockReturnValue({ width: 360, height: 400 } as DOMRect)
  panelPages.append(loading)
  body.append(panelPages)
  return loading
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const element of ownedElements.splice(0)) element.remove()
})

describe('useChatPurchaseActivity', () => {
  it('reads the native offer already in the carrier iframe and follows its visibility', async () => {
    const { carrier, body } = createCarrier()
    const offer = mountNativeOffer(body)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))

    expect(onChange).toHaveBeenLastCalledWith(true)

    offer.hidden = true
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)

    offer.hidden = false
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(true)
  })

  it.each([true, false])('rebinds a replaced body without a load event when initially open=%s', async initiallyOpen => {
    const { carrier, iframe, body: oldBody } = createCarrier()
    const oldOffer = mountNativeOffer(oldBody)
    oldOffer.hidden = !initiallyOpen
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(initiallyOpen)
    const doc = oldBody.ownerDocument
    const nextBody = doc.createElement('body')
    const nextOffer = mountNativeOffer(nextBody)
    nextOffer.hidden = initiallyOpen

    act(() => oldBody.replaceWith(nextBody))
    await settleMutation()

    expect(iframe.contentDocument).toBe(doc)
    expect(doc.body).toBe(nextBody)
    expect(onChange).toHaveBeenLastCalledWith(!initiallyOpen)

    onChange.mockClear()
    oldOffer.hidden = initiallyOpen
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()
    nextOffer.hidden = !initiallyOpen
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(initiallyOpen)

    unmount()
    onChange.mockClear()
    act(() => nextBody.replaceWith(doc.createElement('body')))
    nextOffer.hidden = initiallyOpen
    iframe.dispatchEvent(new Event('load'))
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('continues an open offer through a same-document body replacement containing native loading', async () => {
    const { carrier, body: oldBody } = createCarrier()
    const oldOffer = mountNativeOffer(oldBody)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    const nextBody = oldBody.ownerDocument.createElement('body')
    const loading = mountNativeLoading(nextBody)
    onChange.mockClear()

    act(() => oldBody.replaceWith(nextBody))
    await settleMutation()

    expect(onChange.mock.calls).toEqual([[true]])
    onChange.mockClear()
    oldOffer.hidden = true
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()

    loading.hidden = true
    await settleMutation()
    expect(onChange.mock.calls).toEqual([[false]])
  })

  it('does not treat an initially visible native loading spinner as an open purchase', () => {
    const { carrier, body } = createCarrier()
    mountNativeLoading(body)
    const onChange = vi.fn()

    renderHook(() => useChatPurchaseActivity(carrier, onChange))

    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).not.toHaveBeenCalledWith(true)
  })

  it('keeps an open offer through a temporarily missing body in the same document', async () => {
    const { carrier, body } = createCarrier()
    mountNativeOffer(body)
    const doc = body.ownerDocument
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    onChange.mockClear()

    act(() => body.remove())
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()

    const nextBody = doc.createElement('body')
    const loading = mountNativeLoading(nextBody)
    act(() => doc.documentElement.append(nextBody))
    await settleMutation()
    expect(onChange.mock.calls).toEqual([[true]])

    loading.hidden = true
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('resets an offer before a different accessible document creates its initial loading body', async () => {
    const { carrier, iframe, body } = createCarrier()
    mountNativeOffer(body)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    const replacement = createCarrier()
    const nextDocument = replacement.body.ownerDocument
    replacement.body.remove()
    Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => nextDocument })
    onChange.mockClear()

    act(() => iframe.dispatchEvent(new Event('load')))

    expect(onChange.mock.calls).toEqual([[false]])
    onChange.mockClear()
    const nextBody = nextDocument.createElement('body')
    mountNativeLoading(nextBody)
    act(() => nextDocument.documentElement.append(nextBody))
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).not.toHaveBeenCalledWith(true)
  })

  it.each(['document', 'iframe'])('does not carry purchase activity to loading in a replacement %s', async replacementKind => {
    const { carrier, iframe, body } = createCarrier()
    mountNativeOffer(body)
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)
    const replacement = createCarrier()
    mountNativeLoading(replacement.body)
    onChange.mockClear()

    if (replacementKind === 'document') {
      Object.defineProperty(iframe, 'contentDocument', {
        configurable: true,
        get: () => replacement.iframe.contentDocument,
      })
      act(() => iframe.dispatchEvent(new Event('load')))
    } else {
      const nextIframe = document.createElement('iframe')
      Object.defineProperty(nextIframe, 'contentDocument', { get: () => replacement.iframe.contentDocument })
      act(() => carrier.replaceChildren(nextIframe))
      await settleMutation()
    }

    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).not.toHaveBeenCalledWith(true)
  })

  it('begins observing when an initially missing body is added without a load event', async () => {
    const { carrier, body } = createCarrier()
    const doc = body.ownerDocument
    body.remove()
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(false)
    const nextBody = doc.createElement('body')
    mountNativeOffer(nextBody)

    act(() => doc.documentElement.append(nextBody))
    await settleMutation()

    expect(onChange).toHaveBeenLastCalledWith(true)
  })

  it('rebinds on native document load and releases the previous document observer', async () => {
    const { carrier, iframe, body: oldBody } = createCarrier()
    const oldOffer = mountNativeOffer(oldBody)
    const replacement = createCarrier()
    const onChange = vi.fn()
    renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)

    // Model a native reload at the browser document boundary; both bodies are
    // real iframe documents, and purchase detection is the production observer.
    Object.defineProperty(iframe, 'contentDocument', {
      configurable: true,
      get: () => replacement.iframe.contentDocument,
    })
    act(() => iframe.dispatchEvent(new Event('load')))
    expect(onChange).toHaveBeenLastCalledWith(false)

    onChange.mockClear()
    oldOffer.hidden = true
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()

    mountNativeOffer(replacement.body)
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(true)
  })

  it('binds a replacement iframe and ignores native changes after cleanup', async () => {
    const { carrier, body: oldBody } = createCarrier()
    const oldOffer = mountNativeOffer(oldBody)
    const onChange = vi.fn()
    const { unmount } = renderHook(() => useChatPurchaseActivity(carrier, onChange))
    expect(onChange).toHaveBeenLastCalledWith(true)

    const nextIframe = document.createElement('iframe')
    act(() => carrier.replaceChildren(nextIframe))
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(false)
    const nextBody = nextIframe.contentDocument?.body
    if (!nextBody) throw new Error('Missing replacement native chat document')
    const nextOffer = mountNativeOffer(nextBody)
    await settleMutation()
    expect(onChange).toHaveBeenLastCalledWith(true)

    onChange.mockClear()
    oldOffer.hidden = true
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()

    unmount()
    expect(onChange).toHaveBeenLastCalledWith(false)
    onChange.mockClear()
    nextOffer.hidden = true
    nextIframe.dispatchEvent(new Event('load'))
    mountNativeOffer(nextBody)
    await settleMutation()
    expect(onChange).not.toHaveBeenCalled()
  })

  it.each(['denied', 'null'])(
    'releases an inaccessible document but holds its open presentation until the frame returns or is removed (%s)',
    async mode => {
      const { carrier, iframe, body } = createCarrier()
      const offer = mountNativeOffer(body)
      const onChange = vi.fn()
      renderHook(() => useChatPurchaseActivity(carrier, onChange))
      expect(onChange).toHaveBeenLastCalledWith(true)
      Object.defineProperty(iframe, 'contentDocument', {
        configurable: true,
        get: () => {
          if (mode === 'denied') throw new DOMException('Cross-origin document', 'SecurityError')
          return null
        },
      })

      expect(() => act(() => iframe.dispatchEvent(new Event('load')))).not.toThrow()
      expect(onChange).toHaveBeenLastCalledWith(true)
      onChange.mockClear()
      offer.hidden = true
      await settleMutation()
      expect(onChange).not.toHaveBeenCalled()

      const replacement = createCarrier()
      Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => replacement.iframe.contentDocument })
      act(() => iframe.dispatchEvent(new Event('load')))
      expect(onChange).toHaveBeenLastCalledWith(false)
      mountNativeOffer(replacement.body)
      await settleMutation()
      expect(onChange).toHaveBeenLastCalledWith(true)
      act(() => iframe.remove())
      await settleMutation()
      expect(onChange).toHaveBeenLastCalledWith(false)
    },
  )
})

it('ignores a queued document callback after Firefox revokes its wrapper', () => {
  const callbacks: MutationCallback[] = []
  const NativeMutationObserver = MutationObserver
  vi.stubGlobal(
    'MutationObserver',
    class extends NativeMutationObserver {
      constructor(callback: MutationCallback) {
        super(callback)
        this.callback = callback
      }
      private callback: MutationCallback
      override observe(target: Node, options?: MutationObserverInit) {
        if (target.nodeName === 'HTML') callbacks.push(this.callback)
        super.observe(target, options)
      }
    },
  )
  const { carrier, body } = createCarrier()
  const doc = body.ownerDocument
  const onChange = vi.fn()
  const { unmount } = renderHook(() => useChatPurchaseActivity(carrier, onChange))
  expect(callbacks).toHaveLength(1)
  const dead = () => {
    throw new TypeError("can't access dead object")
  }
  vi.spyOn(doc, 'nodeType', 'get').mockImplementation(dead)
  vi.spyOn(doc, 'body', 'get').mockImplementation(dead)
  expect(() => callbacks[0]?.([], {} as MutationObserver)).not.toThrow()
  unmount()
})
