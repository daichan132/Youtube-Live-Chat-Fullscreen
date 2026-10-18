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

afterEach(() => {
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
