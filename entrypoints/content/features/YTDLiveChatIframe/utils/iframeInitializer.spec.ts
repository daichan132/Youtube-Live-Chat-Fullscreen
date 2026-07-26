import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_STYLE_MARKER_ATTR } from '../constants/styleContract'
import {
  ensureStyleInjected,
  installMembershipFallback,
  MEMBERSHIP_FALLBACK_MARKER_ATTR,
  uninstallMembershipFallback,
} from './iframeInitializer'

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

  it('opens the channel join page when membership picker fallback is clicked', () => {
    const doc = createChatDoc()
    const item = doc.createElement('yt-live-chat-product-picker-panel-item-view-model')
    item.setAttribute('item-id', 'Membership')
    const endpoint = doc.createElement('a')
    endpoint.id = 'endpoint'
    endpoint.textContent = 'Membership'
    item.appendChild(endpoint)
    Object.defineProperty(item, 'data', {
      value: {
        onTapCommand: {
          parallelCommand: {
            commands: [
              {
                innertubeCommand: {
                  ypcGetOffersEndpoint: {
                    params: `sku-${encodeURIComponent(btoa('channel:UCSJ4gkVC6NrvII8umztf0Ow'))}`,
                  },
                },
              },
            ],
          },
        },
      },
      configurable: true,
    })
    doc.body.appendChild(item)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    installMembershipFallback(doc)
    endpoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(openSpy).toHaveBeenCalledWith('https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow/join', '_blank', 'noopener')
    expect(doc.body.getAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe('true')

    expect(uninstallMembershipFallback(doc)).toBe(true)
    endpoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(doc.body.hasAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe(false)
    expect(uninstallMembershipFallback(doc)).toBe(false)
  })

  it('preserves a membership fallback marker it did not install', () => {
    const doc = createChatDoc()
    doc.body.setAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR, 'native-value')

    installMembershipFallback(doc)

    expect(uninstallMembershipFallback(doc)).toBe(false)
    expect(doc.body.getAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe('native-value')
  })
})
