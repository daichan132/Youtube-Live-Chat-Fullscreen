import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { PageObservation, PageTargets } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'
import { ResourceReconciler } from './ResourceReconciler'
import { createBorrowedIframeLease, createManagedIframeLease } from './resources/ChatIframeLease'

const videoId = 'current-video'
const originalHref = 'https://www.youtube.com/live_chat?continuation=original-source'
const createChatDocument = (id: string) => {
  const document = window.document.implementation.createHTMLDocument('')
  document.body.innerHTML = `<yt-live-chat-renderer><yt-live-chat-sign-in-prompt-renderer><a href="/signin?next=${encodeURIComponent(
    `/watch?v=${id}`,
  )}">Sign in</a></yt-live-chat-sign-in-prompt-renderer></yt-live-chat-renderer>`
  return new Proxy(document, {
    get(target, key) {
      if (key === 'location') return { href: originalHref }
      if (key === 'referrer') return 'https://www.youtube.com/@channel/live'
      const value = Reflect.get(target, key, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

const getChatVideoId = (iframe: HTMLIFrameElement) => {
  const href = iframe.contentDocument?.querySelector('a')?.getAttribute('href')
  const next = href ? new URL(href, window.location.origin).searchParams.get('next') : null
  return next ? new URL(next, window.location.origin).searchParams.get('v') : null
}

const createHarness = (stateful = true) => {
  const host = document.createElement('ytd-live-chat-frame')
  host.setAttribute('video-id', videoId)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('video-id', videoId)
  iframe.src = originalHref
  const sibling = document.createElement('div')
  host.append(iframe, sibling)
  const overlay = document.createElement('div')
  const carrier = document.createElement('div')
  overlay.attachShadow({ mode: 'open' }).append(carrier)
  document.body.append(host, overlay)
  const updatedDocument = createChatDocument(videoId)
  let activeDocument = updatedDocument
  let reloads = 0
  Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => activeDocument })
  const insert = window.Node.prototype.insertBefore
  const append = window.Node.prototype.appendChild
  const instrumentParent = (parent: HTMLElement) => {
    // Model the browser's ordinary reparent reload separately from the new API.
    // Native Firefox/Chrome verification owns proof of real browsing-context preservation.
    const reloadIfMoved = (node: Node) => {
      if (node !== iframe || iframe.parentNode === parent) return
      activeDocument = createChatDocument('original-video')
      reloads += 1
    }
    vi.spyOn(parent, 'insertBefore').mockImplementation(<T extends Node>(node: T, reference: Node | null) => {
      reloadIfMoved(node)
      return insert.call(parent, node, reference) as T
    })
    vi.spyOn(parent, 'appendChild').mockImplementation(<T extends Node>(node: T) => {
      reloadIfMoved(node)
      return append.call(parent, node) as T
    })
    const move = vi.fn((node: Node, reference: Node | null) => {
      insert.call(parent, node, reference)
    })
    Object.defineProperty(parent, 'moveBefore', { configurable: true, value: stateful ? move : undefined })
    return move
  }
  const hostMove = instrumentParent(host)
  const carrierMove = instrumentParent(carrier)
  const targetsFor = (nativeChatHost: HTMLElement): PageTargets => ({
    player: null,
    fullscreenRoot: null,
    rightControls: null,
    nativeChatHost,
    nativeChatIframe: null,
    chatIframe: null,
    archiveOpenControl: null,
  })
  return {
    host,
    overlay,
    iframe,
    sibling,
    carrier,
    updatedDocument,
    hostMove,
    carrierMove,
    instrumentParent,
    targetsFor,
    get reloads() {
      return reloads
    },
  }
}

beforeEach(() => {
  document.body.replaceChildren()
  window.history.replaceState({}, '', `/watch?v=${videoId}`)
})

describe('borrowed iframe state across presentation moves', () => {
  it.each(['placeholder', 'original-parent', 'rebuilt-host'] as const)(
    'preserves the SPA-updated chat through attach and %s restoration without reloading its original continuation',
    restoreTarget => {
      const harness = createHarness()
      const { host, iframe, sibling, carrier, updatedDocument, carrierMove, instrumentParent, targetsFor } = harness
      const lease = createBorrowedIframeLease(iframe, videoId)

      lease.attach(carrier)
      lease.attach(carrier)

      expect(getChatVideoId(iframe)).toBe(videoId)
      expect(iframe.contentDocument).toBe(updatedDocument)
      expect(carrierMove).toHaveBeenCalledTimes(1)
      let target = host
      let move = harness.hostMove
      if (restoreTarget === 'original-parent') {
        for (const child of host.childNodes) if (child.nodeType === Node.COMMENT_NODE) child.remove()
      } else if (restoreTarget === 'rebuilt-host') {
        host.remove()
        target = document.createElement('ytd-live-chat-frame')
        target.setAttribute('video-id', videoId)
        target.append(sibling)
        document.body.append(target)
        move = instrumentParent(target)
      }

      lease.release({}, targetsFor(target))
      lease.release()

      expect(lease.state).toBe('released')
      expect(target.firstChild).toBe(iframe)
      expect(iframe.nextSibling).toBe(sibling)
      expect(iframe.contentDocument).toBe(updatedDocument)
      expect(getChatVideoId(iframe)).toBe(videoId)
      expect(move).toHaveBeenCalledTimes(1)
      expect(harness.reloads).toBe(0)
      expect(iframe.getAttribute('src')).toBe(originalHref)
    },
  )

  it('does not set a blank src when a loaded native document can be preserved', () => {
    const { iframe, carrier, updatedDocument } = createHarness()
    iframe.setAttribute('src', 'about:blank')
    const srcWrite = vi.spyOn(iframe, 'src', 'set')
    const lease = createBorrowedIframeLease(iframe, videoId)

    lease.attach(carrier)
    lease.release()

    expect(srcWrite).not.toHaveBeenCalled()
    expect(iframe.getAttribute('src')).toBe('about:blank')
    expect(iframe.contentDocument).toBe(updatedDocument)
    expect(getChatVideoId(iframe)).toBe(videoId)
  })

  it('uses the existing insertion fallback when the browser has no state-preserving move API', () => {
    const { iframe, carrier, host, carrierMove } = createHarness(false)
    const lease = createBorrowedIframeLease(iframe, videoId)

    lease.attach(carrier)
    lease.release()

    expect(carrierMove).not.toHaveBeenCalled()
    expect(iframe.parentElement).toBe(host)
    expect(lease.state).toBe('released')
  })

  it('does not silently reload the old continuation when a supported state-preserving move fails', () => {
    const { iframe, host, carrier, carrierMove, updatedDocument } = createHarness()
    carrierMove.mockImplementationOnce(() => {
      throw new DOMException('Unable to preserve the browsing context', 'HierarchyRequestError')
    })
    const lease = createBorrowedIframeLease(iframe, videoId)

    expect(() => lease.attach(carrier)).toThrow('Unable to preserve the browsing context')

    expect(carrier.insertBefore).not.toHaveBeenCalled()
    expect(carrier.appendChild).not.toHaveBeenCalled()
    expect(iframe.parentElement).toBe(host)
    expect(iframe.contentDocument).toBe(updatedDocument)
    expect(getChatVideoId(iframe)).toBe(videoId)
    lease.release()
    expect(lease.state).toBe('released')
  })

  it('does not move a previous-video iframe back into a newly navigated native host', () => {
    const { iframe, host, carrier, hostMove } = createHarness()
    const lease = createBorrowedIframeLease(iframe, videoId)
    lease.attach(carrier)
    window.history.replaceState({}, '', '/watch?v=another-video')
    host.setAttribute('video-id', 'another-video')

    lease.release()

    expect(hostMove).not.toHaveBeenCalled()
    expect(iframe.isConnected).toBe(false)
    expect(lease.state).toBe('released')
  })

  it('preserves the document through a transient restore failure before presentation and carrier cleanup', () => {
    const { iframe, host, overlay, carrier, hostMove, updatedDocument, instrumentParent, targetsFor } = createHarness()
    const parking = document.createElement('div')
    const parkingMove = instrumentParent(parking)
    const presentation = {
      sync: vi.fn(() => ({ overlayRoot: overlay.shadowRoot, switchContainer: null })),
      clear: vi.fn(() => overlay.remove()),
    }
    const resources = new ResourceReconciler({ presentation, chatChrome: { sync: vi.fn(), release: vi.fn() } })
    resources.createIframe({ kind: 'available', videoId, mode: 'live', source: { kind: 'live_borrow', videoId, iframe } }, 1)
    resources.lease?.attach(carrier)
    hostMove.mockImplementationOnce(() => {
      throw new DOMException('Transient native restore failure', 'HierarchyRequestError')
    })
    vi.spyOn(document, 'createElement').mockReturnValueOnce(parking)

    expect(() => resources.clear(targetsFor(host))).not.toThrow()
    // Runtime reset also unmounts the React-owned carrier after clearing presentation.
    carrier.remove()

    expect(parkingMove).toHaveBeenCalledOnce()
    expect(hostMove).toHaveBeenCalledTimes(2)
    expect(parking.isConnected).toBe(false)
    expect(iframe.parentElement).toBe(host)
    expect(iframe.contentDocument).toBe(updatedDocument)
    expect(getChatVideoId(iframe)).toBe(videoId)
    expect(resources.lease).toBeNull()
  })

  it.each(['native target', 'parking owner', 'missing parking API'])(
    'disposes a persistently failing %s without reloading the old continuation or retaining owners',
    failure => {
      const { iframe, host, overlay, carrier, hostMove, instrumentParent, targetsFor } = createHarness()
      const parking = document.createElement('div')
      const parkingMove = instrumentParent(parking)
      const resources = new ResourceReconciler({
        presentation: {
          sync: vi.fn(() => ({ overlayRoot: overlay.shadowRoot, switchContainer: null })),
          clear: vi.fn(() => overlay.remove()),
        },
        chatChrome: { sync: vi.fn(), release: vi.fn() },
      })
      resources.createIframe({ kind: 'available', videoId, mode: 'live', source: { kind: 'live_borrow', videoId, iframe } }, 1)
      const lease = resources.lease
      lease?.attach(carrier)
      const sourceWrite = vi.spyOn(iframe, 'src', 'set')
      const removeListener = vi.spyOn(iframe, 'removeEventListener')
      hostMove.mockImplementation(() => {
        throw new DOMException('Persistent native restore failure', 'HierarchyRequestError')
      })
      if (failure === 'parking owner') {
        parkingMove.mockImplementation(() => {
          throw new DOMException('Unable to park the iframe', 'HierarchyRequestError')
        })
      } else if (failure === 'missing parking API') {
        Object.defineProperty(parking, 'moveBefore', { configurable: true, value: undefined })
      }
      vi.spyOn(document, 'createElement').mockReturnValueOnce(parking)

      expect(() => resources.clear(targetsFor(host))).toThrow('Persistent native restore failure')
      carrier.remove()

      expect(parkingMove).toHaveBeenCalledTimes(failure === 'missing parking API' ? 0 : 1)
      expect(hostMove).toHaveBeenCalledTimes(failure === 'native target' ? 2 : 1)
      expect(parking.insertBefore).not.toHaveBeenCalled()
      expect(parking.isConnected).toBe(false)
      expect(iframe.isConnected).toBe(false)
      expect(sourceWrite).not.toHaveBeenCalled()
      expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function))
      expect(Array.from(host.childNodes).some(node => node.nodeType === Node.COMMENT_NODE)).toBe(false)
      expect(lease?.state).toBe('released')
      expect(() => resources.clear(targetsFor(host))).not.toThrow()
      expect(resources.lease).toBeNull()
    },
  )

  it('uses ordinary insertion for a detached iframe pending native-host reconstruction', () => {
    const { iframe, carrier, host, instrumentParent, targetsFor } = createHarness()
    const lease = createBorrowedIframeLease(iframe, videoId)
    lease.attach(carrier)
    host.remove()
    lease.release()
    expect(lease.state).toBe('restoring')
    const rebuilt = document.createElement('ytd-live-chat-frame')
    rebuilt.setAttribute('video-id', videoId)
    document.body.append(rebuilt)
    const move = instrumentParent(rebuilt)

    lease.reconcile(targetsFor(rebuilt))

    expect(move).not.toHaveBeenCalled()
    expect(iframe.parentElement).toBe(rebuilt)
    expect(lease.state).toBe('released')
  })

  it('does not call state-preserving movement for a newly created managed iframe', () => {
    const { carrier, carrierMove } = createHarness()
    const lease = createManagedIframeLease('https://www.youtube.com/live_chat?v=current-video', videoId)

    lease.attach(carrier)

    expect(carrierMove).not.toHaveBeenCalled()
    expect(lease.iframe.parentElement).toBe(carrier)
    lease.release()
    expect(lease.iframe.isConnected).toBe(false)
  })

  it('restores without using an original sibling that moved into another descendant', () => {
    const { host, iframe, sibling, carrier } = createHarness()
    const lease = createBorrowedIframeLease(iframe, videoId)
    lease.attach(carrier)
    for (const child of host.childNodes) if (child.nodeType === Node.COMMENT_NODE) child.remove()
    const wrapper = document.createElement('div')
    wrapper.append(sibling)
    host.append(wrapper)

    expect(() => lease.release()).not.toThrow()
    expect(host.lastChild).toBe(iframe)
    expect(lease.state).toBe('released')
  })

  it.each(['live', 'archive'] as const)('returns the %s iframe before a fullscreen exit handler can detach its carrier', mode => {
    vi.useFakeTimers()
    const harness = createHarness()
    const { iframe, host, overlay, carrier, updatedDocument, targetsFor } = harness
    iframe.removeAttribute('src')
    let fullscreen = true
    let detachedBeforeRestore = false
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => (fullscreen ? overlay : null) })
    const pageExit = () => {
      detachedBeforeRestore = carrier.contains(iframe)
      carrier.remove()
    }
    // YouTube's bubble handler may run before an extension listener registered later.
    document.addEventListener('fullscreenchange', pageExit)
    const readObservation = (): PageObservation => ({
      evidence: {
        generation: 0,
        videoId,
        route: 'watch',
        fullscreen,
        videoMode: mode,
        chatAvailability: 'ready',
        capabilities: {
          canBorrowNativeChat: true,
          canCreateManagedLiveChat: false,
          canOpenArchiveChat: mode === 'archive',
          canRestoreNativeChat: true,
          canMountOverlay: true,
          canMountPlayerSwitch: false,
        },
        sourceKind: mode === 'archive' ? 'native-replay' : 'native-live',
        probeIds: [],
      },
      targets: { ...targetsFor(host), player: overlay, fullscreenRoot: fullscreen ? overlay : null, chatIframe: iframe },
    })
    const runtime = new ChatRuntimeImpl({
      portalHost: { sync: () => ({ overlayRoot: overlay.shadowRoot, switchContainer: null }), clear: () => overlay.remove() },
      readObservation,
      resolveDecision: () =>
        fullscreen
          ? {
              kind: 'available',
              videoId,
              mode,
              source: mode === 'archive' ? { kind: 'archive_borrow', iframe } : { kind: 'live_borrow', videoId, iframe },
            }
          : { kind: 'inactive', reason: 'not-fullscreen' },
    })
    try {
      runtime.setEnabled(true)
      runtime.setProfile(DEFAULT_CHAT_PROFILE)
      runtime.setOverlayContainer(carrier)
      runtime.start()
      vi.advanceTimersByTime(20)
      expect(iframe.parentElement).toBe(carrier)
      fullscreen = false

      document.dispatchEvent(new Event('fullscreenchange'))

      expect(detachedBeforeRestore).toBe(false)
      expect(iframe.parentElement).toBe(host)
      expect(iframe.contentDocument).toBe(updatedDocument)
      expect(getChatVideoId(iframe)).toBe(videoId)
      expect(iframe.hasAttribute('src')).toBe(false)
      expect(harness.reloads).toBe(0)
      vi.advanceTimersByTime(20)
      expect(runtime.getSnapshot().showOverlay).toBe(false)
    } finally {
      runtime.stop()
      document.removeEventListener('fullscreenchange', pageExit)
      Reflect.deleteProperty(document, 'fullscreenElement')
      vi.useRealTimers()
    }
  })
})
