import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatSource } from '@/entrypoints/content/chat/runtime/types'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import {
  IFRAME_CHAT_BODY_CLASS,
  IFRAME_CHAT_ONLY_CLASS,
  IFRAME_CHAT_ONLY_MEASURING_CLASS,
  IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR,
  IFRAME_CHAT_ONLY_TRANSITION_CLASS,
  IFRAME_STYLE_MARKER_ATTR,
} from '../constants/styleContract'
import { attachIframeToContainer, detachAttachedIframe, resolveSourceIframe } from './iframeAttachment'

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  openArchiveNativeChatPanel: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/nativeChatState', () => ({
  isNativeChatOpen: vi.fn(),
}))

const openArchiveNativeChatPanelMock = vi.mocked(openArchiveNativeChatPanel)
const isNativeChatOpenMock = vi.mocked(isNativeChatOpen)

const setLocation = (path: string) => {
  const base = window.location.origin
  window.history.pushState({}, '', `${base}${path}`)
}

beforeEach(() => {
  document.body.innerHTML = ''
  setLocation('/watch?v=video-a')
  openArchiveNativeChatPanelMock.mockReset()
  isNativeChatOpenMock.mockReset()
  isNativeChatOpenMock.mockReturnValue(false)
})

describe('iframeAttachment', () => {
  it('creates and reuses managed iframe for live source', () => {
    const source: ChatSource = {
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    }

    const managed = resolveSourceIframe(source, null)
    expect(managed.getAttribute('data-ylc-owned')).toBe('true')
    expect(managed.src).toContain('/live_chat?v=video-a')

    const reused = resolveSourceIframe(source, managed)
    expect(reused).toBe(managed)
  })

  it('returns native iframe directly for live borrow source', () => {
    const nativeLiveIframe = document.createElement('iframe') as HTMLIFrameElement
    nativeLiveIframe.src = 'https://www.youtube.com/live_chat?v=video-a'

    const source: ChatSource = {
      kind: 'live_borrow',
      videoId: 'video-a',
      iframe: nativeLiveIframe,
    }

    const resolved = resolveSourceIframe(source, null)
    expect(resolved).toBe(nativeLiveIframe)
  })

  it('creates a managed iframe for live direct source instead of reusing unrelated native iframe', () => {
    const source: ChatSource = {
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    }
    const nativeLiveIframe = document.createElement('iframe') as HTMLIFrameElement
    nativeLiveIframe.src = source.url

    const resolved = resolveSourceIframe(source, nativeLiveIframe)
    expect(resolved).not.toBe(nativeLiveIframe)
    expect(resolved.getAttribute('data-ylc-owned')).toBe('true')
    expect(resolved.getAttribute('data-ylc-source')).toBe('live_direct')
    expect(resolved.src).toContain('/live_chat?v=video-a')
  })

  it('creates a new managed iframe when live source video changes', () => {
    const sourceA: ChatSource = {
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    }
    const sourceB: ChatSource = {
      kind: 'live_direct',
      videoId: 'video-b',
      url: 'https://www.youtube.com/live_chat?v=video-b',
    }

    const managedA = resolveSourceIframe(sourceA, null)
    const managedB = resolveSourceIframe(sourceB, managedA)

    expect(managedB).not.toBe(managedA)
    expect(managedB.getAttribute('data-ylc-owned')).toBe('true')
    expect(managedB.getAttribute('data-ylc-source')).toBe('live_direct')
    expect(managedB.src).toContain('/live_chat?v=video-b')
  })

  it('returns native iframe directly for archive borrow source', () => {
    const nativeIframe = document.createElement('iframe') as HTMLIFrameElement
    nativeIframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'

    const source: ChatSource = {
      kind: 'archive_borrow',
      iframe: nativeIframe,
    }

    const resolved = resolveSourceIframe(source, null)
    expect(resolved).toBe(nativeIframe)
  })

  it('attaches iframe to container with expected attributes and style', () => {
    const container = document.createElement('div') as HTMLDivElement
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)

    expect(container.contains(iframe)).toBe(true)
    expect(iframe.getAttribute('data-ylc-chat')).toBe('true')
    expect(iframe.style.width).toBe('100%')
    expect(iframe.style.height).toBe('100%')
    expect(iframe.style.borderStyle).toBe('none')
    expect(iframe.style.borderWidth).toBe('0px')
    expect(iframe.style.outline).toBe('none')
    expect(iframe.style.zIndex).toBe(String(CHAT_PANEL_LAYER.iframe))
  })

  it('syncs borrowed iframe src from non-blank document href before moving', () => {
    const container = document.createElement('div') as HTMLDivElement
    const parent = document.createElement('div')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.setAttribute('src', 'about:blank')
    Object.defineProperty(iframe, 'contentDocument', {
      value: {
        location: { href: 'https://www.youtube.com/live_chat_replay?v=video-a' },
      } as Document,
      configurable: true,
    })
    parent.appendChild(iframe)
    document.body.appendChild(parent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)

    expect(iframe.src).toContain('/live_chat_replay?v=video-a')
  })

  it('moves and restores only native iframe when borrowing archive source', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const sentinel = document.createElement('div')
    sentinel.id = 'sentinel'
    iframe.style.width = '320px'
    iframe.style.height = '180px'
    iframe.style.borderStyle = 'solid'
    iframe.style.borderWidth = '2px'
    iframe.style.outline = '1px solid red'

    host.appendChild(iframe)
    originalParent.appendChild(sentinel)
    originalParent.appendChild(host)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    expect(container.contains(host)).toBe(false)
    expect(container.contains(iframe)).toBe(true)
    expect(host.contains(iframe)).toBe(false)

    detachAttachedIframe(iframe, container)
    expect(originalParent.contains(host)).toBe(true)
    expect(host.contains(iframe)).toBe(true)
    expect(originalParent.children[1]).toBe(host)
    expect(iframe.getAttribute('data-ylc-chat')).toBeNull()
    expect(iframe.style.width).toBe('320px')
    expect(iframe.style.height).toBe('180px')
    expect(iframe.style.borderStyle).toBe('solid')
    expect(iframe.style.borderWidth).toBe('2px')
    expect(iframe.style.outline).toBe('1px solid red')
  })

  it('cleans extension iframe document styles when restoring a borrowed iframe', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const doc = document.implementation.createHTMLDocument('')
    doc.body.classList.add(
      IFRAME_CHAT_BODY_CLASS,
      IFRAME_CHAT_ONLY_CLASS,
      IFRAME_CHAT_ONLY_TRANSITION_CLASS,
      IFRAME_CHAT_ONLY_MEASURING_CLASS,
    )
    doc.body.style.setProperty('backdrop-filter', 'blur(8px)')
    doc.body.style.setProperty('-webkit-backdrop-filter', 'blur(8px)')
    doc.body.style.setProperty('--extension-chat-only-header-height', '54px')
    doc.body.style.setProperty('--extension-chat-only-input-panel-height', '112px')
    doc.body.style.setProperty('--extension-chat-only-input-height', '96px')
    const header = doc.createElement('yt-live-chat-header-renderer')
    header.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, '54px')
    doc.body.appendChild(header)
    const injectedStyle = doc.createElement('style')
    injectedStyle.setAttribute(IFRAME_STYLE_MARKER_ATTR, 'true')
    doc.head.appendChild(injectedStyle)
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    host.appendChild(iframe)
    originalParent.appendChild(host)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    detachAttachedIframe(iframe, container)

    expect(host.contains(iframe)).toBe(true)
    expect(doc.body.classList.contains(IFRAME_CHAT_BODY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_MEASURING_CLASS)).toBe(false)
    expect(doc.body.style.getPropertyValue('backdrop-filter')).toBe('')
    expect(doc.body.style.getPropertyValue('-webkit-backdrop-filter')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-header-height')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-input-panel-height')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-input-height')).toBe('')
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(doc.head.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).toBeNull()
  })

  it('falls back to current native host when original restore target was removed', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)

    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    expect(container.contains(iframe)).toBe(true)

    // Simulate YouTube rebuilding the chat host while iframe is borrowed.
    originalParent.remove()
    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    rebuiltHost.setAttribute('video-id', 'video-a')
    document.body.appendChild(rebuiltHost)

    detachAttachedIframe(iframe, container)

    expect(rebuiltHost.contains(iframe)).toBe(true)
    expect(container.contains(iframe)).toBe(false)
    expect(iframe.getAttribute('data-ylc-chat')).toBeNull()
  })

  it('falls back to native host identified through a current child iframe', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)

    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    originalParent.remove()

    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    const rebuiltIframe = document.createElement('iframe')
    rebuiltIframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    rebuiltHost.appendChild(rebuiltIframe)
    document.body.appendChild(rebuiltHost)

    detachAttachedIframe(iframe, container)

    expect(rebuiltHost.contains(iframe)).toBe(true)
    expect(container.contains(iframe)).toBe(false)
    expect(iframe.getAttribute('data-ylc-chat')).toBeNull()
  })

  it('waits instead of falling back to a stale native host for another video', async () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    originalParent.remove()
    const staleHost = document.createElement('ytd-live-chat-frame')
    staleHost.setAttribute('video-id', 'video-b')
    document.body.appendChild(staleHost)

    detachAttachedIframe(iframe, container)

    expect(staleHost.contains(iframe)).toBe(false)
    expect(container.contains(iframe)).toBe(false)
    expect(iframe.isConnected).toBe(false)

    const currentHost = document.createElement('ytd-live-chat-frame')
    currentHost.setAttribute('video-id', 'video-a')
    document.body.appendChild(currentHost)
    await Promise.resolve()
    await Promise.resolve()

    expect(currentHost.contains(iframe)).toBe(true)
  })

  it('restores a queued iframe when an existing host video marker catches up', async () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    originalParent.remove()
    const host = document.createElement('ytd-live-chat-frame')
    host.setAttribute('video-id', 'video-b')
    document.body.appendChild(host)

    detachAttachedIframe(iframe, container)

    expect(host.contains(iframe)).toBe(false)
    host.setAttribute('video-id', 'video-a')
    await Promise.resolve()
    await Promise.resolve()

    expect(host.contains(iframe)).toBe(true)
  })

  it('queues restore safely when no native host exists at detach time', async () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement

    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    expect(container.contains(iframe)).toBe(true)

    originalParent.remove()
    detachAttachedIframe(iframe, container)

    expect(iframe.isConnected).toBe(false)
    expect(iframe.getAttribute('data-ylc-chat')).toBeNull()

    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    rebuiltHost.setAttribute('video-id', 'video-a')
    document.body.appendChild(rebuiltHost)
    await Promise.resolve()
    await Promise.resolve()

    expect(rebuiltHost.contains(iframe)).toBe(true)
  })

  it('does not restore a borrowed iframe into a host for another video', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    originalParent.remove()
    setLocation('/watch?v=video-b')
    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    document.body.appendChild(rebuiltHost)

    detachAttachedIframe(iframe, container)

    expect(rebuiltHost.contains(iframe)).toBe(false)
    expect(container.contains(iframe)).toBe(false)
    expect(iframe.isConnected).toBe(false)
  })

  it('requests one native chat open after archive restore when ensureNativeVisible is enabled', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    host.appendChild(iframe)
    originalParent.appendChild(host)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    detachAttachedIframe(iframe, container, { ensureNativeVisible: true })

    expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)
  })

  it('does not request native chat open when it is already open', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    host.appendChild(iframe)
    originalParent.appendChild(host)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)
    isNativeChatOpenMock.mockReturnValue(true)

    attachIframeToContainer(container, iframe)
    detachAttachedIframe(iframe, container, { ensureNativeVisible: true })

    expect(openArchiveNativeChatPanelMock).not.toHaveBeenCalled()
  })

  it('removes managed iframe on detach', () => {
    const container = document.createElement('div') as HTMLDivElement
    document.body.appendChild(container)

    const source: ChatSource = {
      kind: 'live_direct',
      videoId: 'video-a',
      url: 'https://www.youtube.com/live_chat?v=video-a',
    }
    const managed = resolveSourceIframe(source, null)
    attachIframeToContainer(container, managed)
    expect(container.contains(managed)).toBe(true)

    detachAttachedIframe(managed, container)
    expect(container.contains(managed)).toBe(false)
    expect(managed.isConnected).toBe(false)
  })
})
