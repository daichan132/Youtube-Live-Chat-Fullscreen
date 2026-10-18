import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'
import { ensureStyleInjected } from './iframeInitializer'

const createChatDoc = () => document.implementation.createHTMLDocument('chat') as Document

describe('iframeInitializer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('injects iframe styles once', () => {
    const doc = createChatDoc()

    expect(ensureStyleInjected(doc, 'body { color: red; }')).toBe(true)
    expect(ensureStyleInjected(doc, 'body { color: blue; }')).toBe(false)
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).not.toBeNull()
    expect(doc.head?.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)?.textContent).toBe('body { color: red; }')
  })

  it('leaves native membership clicks and their default action intact', () => {
    const doc = createChatDoc()
    doc.body.innerHTML =
      '<yt-live-chat-product-picker-panel-item-view-model item-id="Membership"><a id="endpoint" href="#native-offer">Membership</a></yt-live-chat-product-picker-panel-item-view-model>'
    const nativeClick = vi.fn()
    const endpoint = doc.querySelector('a')
    if (!endpoint) throw new Error('Missing native membership link')
    endpoint.addEventListener('click', nativeClick)
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    ensureStyleInjected(doc, 'body { color: red; }')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    expect(endpoint.dispatchEvent(click)).toBe(true)
    expect(nativeClick).toHaveBeenCalledOnce()
    expect(click.defaultPrevented).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
})
