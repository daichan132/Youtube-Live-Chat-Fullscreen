import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { YLC_CHAT_ATTR, YLC_OWNED_ATTR } from '@/entrypoints/content/chat/shared/iframeDom'
import { createBorrowedIframeLease, createManagedIframeLease } from './resources/ChatIframeLease'

describe('iframeLease', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/watch?v=video-1')
    document.body.replaceChildren()
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('borrows and restores the exact native iframe identity', () => {
    const nativeHost = document.createElement('ytd-live-chat-frame')
    nativeHost.setAttribute('video-id', 'video-1')
    const iframe = document.createElement('iframe')
    iframe.setAttribute('video-id', 'video-1')
    iframe.src = 'https://www.youtube.com/live_chat?v=video-1'
    nativeHost.appendChild(iframe)
    document.body.appendChild(nativeHost)
    const carrier = document.createElement('div')
    document.body.appendChild(carrier)

    const lease = createBorrowedIframeLease(iframe, 'video-1')
    lease.attach(carrier)

    expect(carrier.firstElementChild).toBe(iframe)
    expect(iframe.getAttribute(YLC_CHAT_ATTR)).toBe('true')

    lease.release()
    lease.release()

    expect(nativeHost.querySelector('iframe')).toBe(iframe)
    expect(iframe.hasAttribute(YLC_CHAT_ATTR)).toBe(false)
  })

  it('removes a managed iframe on release', () => {
    const carrier = document.createElement('div')
    document.body.appendChild(carrier)
    const lease = createManagedIframeLease('https://www.youtube.com/live_chat?v=video-1', 'video-1')

    lease.attach(carrier)
    expect(carrier.firstElementChild).toBe(lease.iframe)
    expect(lease.iframe.getAttribute(YLC_OWNED_ATTR)).toBe('true')

    lease.release()

    expect(lease.iframe.isConnected).toBe(false)
    expect(lease.iframe.hasAttribute(YLC_OWNED_ATTR)).toBe(false)
  })

  it('keeps pending native restoration on the lease and releases idempotently', () => {
    const originalHost = document.createElement('ytd-live-chat-frame')
    originalHost.setAttribute('video-id', 'video-1')
    const iframe = document.createElement('iframe')
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-1'
    originalHost.appendChild(iframe)
    const carrier = document.createElement('div')
    document.body.append(originalHost, carrier)
    const lease = createBorrowedIframeLease(iframe, 'video-1', 'replay', 7)

    lease.attach(carrier)
    originalHost.remove()
    lease.release()
    lease.release()

    expect(lease.generation).toBe(7)
    expect(lease.kind).toBe('borrowed-replay')
    expect(lease.state).toBe('restoring')
    expect(iframe.isConnected).toBe(false)

    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    rebuiltHost.setAttribute('video-id', 'video-1')
    document.body.appendChild(rebuiltHost)
    lease.reconcile()
    lease.reconcile()

    expect(lease.state).toBe('released')
    expect(rebuiltHost.querySelector('iframe')).toBe(iframe)
  })
})
