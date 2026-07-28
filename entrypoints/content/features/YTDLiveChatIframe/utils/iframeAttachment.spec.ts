import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatSource } from '@/entrypoints/content/runtime/types'
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
import {
  attachIframeToContainer,
  detachAttachedIframe,
  reconcilePendingNativeIframeRestores,
  resolveSourceIframe,
} from './iframeAttachment'
import { installMembershipFallback, MEMBERSHIP_FALLBACK_MARKER_ATTR } from './iframeInitializer'

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
    expect(managed).toHaveAttribute('title', 'YouTube live chat')
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
    expect(iframe.getAttribute('allowtransparency')).toBe('true')

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
    expect(iframe.hasAttribute('allowtransparency')).toBe(false)
  })

  it('cleans extension iframe document styles when restoring a borrowed iframe', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.setAttribute('allowtransparency', 'native-value')
    const doc = document.implementation.createHTMLDocument('')
    doc.documentElement.style.setProperty('--yt-live-chat-background-color', 'rgb(1, 2, 3)', 'important')
    doc.documentElement.style.setProperty('--extension-yt-live-font-color', 'rgb(4, 5, 6)')
    doc.documentElement.style.setProperty('font-family', 'Native Chat', 'important')
    const nativeFontFamilyValue = doc.documentElement.style.getPropertyValue('font-family')
    doc.body.style.setProperty('backdrop-filter', 'blur(2px)', 'important')
    doc.body.style.setProperty('-webkit-backdrop-filter', 'blur(3px)')
    const nativeWebkitBackdropFilterValue = doc.body.style.getPropertyValue('-webkit-backdrop-filter')
    iframe.style.setProperty('filter', 'contrast(1.2)', 'important')
    iframe.style.setProperty('-webkit-filter', 'saturate(0.8)')
    const nativeWebkitFilterValue = iframe.style.getPropertyValue('-webkit-filter')
    const nativeFontStyle = doc.createElement('style')
    nativeFontStyle.id = 'custom-font-style'
    nativeFontStyle.textContent = '@font-face { font-family: NativeChat; }'
    doc.head.appendChild(nativeFontStyle)
    const fontStyleNextSibling = doc.createElement('meta')
    doc.head.appendChild(fontStyleNextSibling)
    const header = doc.createElement('yt-live-chat-header-renderer')
    doc.body.appendChild(header)
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })

    host.appendChild(iframe)
    originalParent.appendChild(host)
    document.body.appendChild(originalParent)
    document.body.appendChild(container)

    attachIframeToContainer(container, iframe)
    expect(iframe.getAttribute('allowtransparency')).toBe('true')

    doc.documentElement.style.setProperty('--yt-live-chat-background-color', 'transparent')
    doc.documentElement.style.setProperty('--extension-yt-live-font-color', 'rgb(255, 255, 255)', 'important')
    doc.documentElement.style.setProperty('--extension-user-name-display', 'none')
    doc.documentElement.style.setProperty('font-family', 'Extension Font')
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
    header.style.setProperty(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR, '54px')
    iframe.style.setProperty('filter', 'none')
    iframe.style.setProperty('-webkit-filter', 'none', 'important')
    nativeFontStyle.remove()
    const extensionFontStyle = doc.createElement('style')
    extensionFontStyle.id = 'custom-font-style'
    extensionFontStyle.textContent = "@import url('https://fonts.googleapis.com/css2?family=Extension+Font');"
    doc.head.appendChild(extensionFontStyle)
    const injectedStyle = doc.createElement('style')
    injectedStyle.setAttribute(IFRAME_STYLE_MARKER_ATTR, 'true')
    doc.head.appendChild(injectedStyle)
    // A duplicate load for the same Document must not overwrite the pristine snapshot.
    iframe.dispatchEvent(new Event('load'))
    detachAttachedIframe(iframe, container)

    expect(host.contains(iframe)).toBe(true)
    expect(iframe.getAttribute('allowtransparency')).toBe('native-value')
    expect(doc.body.classList.contains(IFRAME_CHAT_BODY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_TRANSITION_CLASS)).toBe(false)
    expect(doc.body.classList.contains(IFRAME_CHAT_ONLY_MEASURING_CLASS)).toBe(false)
    expect(doc.documentElement.style.getPropertyValue('--yt-live-chat-background-color')).toBe('rgb(1, 2, 3)')
    expect(doc.documentElement.style.getPropertyPriority('--yt-live-chat-background-color')).toBe('important')
    expect(doc.documentElement.style.getPropertyValue('--extension-yt-live-font-color')).toBe('rgb(4, 5, 6)')
    expect(doc.documentElement.style.getPropertyPriority('--extension-yt-live-font-color')).toBe('')
    expect(doc.documentElement.style.getPropertyValue('--extension-user-name-display')).toBe('')
    expect(doc.documentElement.style.getPropertyValue('font-family')).toBe(nativeFontFamilyValue)
    expect(doc.documentElement.style.getPropertyPriority('font-family')).toBe('important')
    expect(doc.body.style.getPropertyValue('backdrop-filter')).toBe('blur(2px)')
    expect(doc.body.style.getPropertyPriority('backdrop-filter')).toBe('important')
    expect(doc.body.style.getPropertyValue('-webkit-backdrop-filter')).toBe(nativeWebkitBackdropFilterValue)
    expect(iframe.style.getPropertyValue('filter')).toBe('contrast(1.2)')
    expect(iframe.style.getPropertyPriority('filter')).toBe('important')
    expect(iframe.style.getPropertyValue('-webkit-filter')).toBe(nativeWebkitFilterValue)
    expect(iframe.style.getPropertyPriority('-webkit-filter')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-header-height')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-input-panel-height')).toBe('')
    expect(doc.body.style.getPropertyValue('--extension-chat-only-input-height')).toBe('')
    expect(header.style.getPropertyValue(IFRAME_CHAT_ONLY_TARGET_HEIGHT_VAR)).toBe('')
    expect(doc.head.querySelector(`style[${IFRAME_STYLE_MARKER_ATTR}="true"]`)).toBeNull()
    expect(doc.head.querySelector('#custom-font-style')).toBe(nativeFontStyle)
    expect(nativeFontStyle.textContent).toBe('@font-face { font-family: NativeChat; }')
    expect(nativeFontStyle.nextSibling).toBe(fontStyleNextSibling)
    expect(extensionFontStyle.isConnected).toBe(false)
  })

  it('snapshots a replacement iframe document once before extension styles are applied', () => {
    const container = document.createElement('div') as HTMLDivElement
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const firstDocument = document.implementation.createHTMLDocument('first')
    const secondDocument = document.implementation.createHTMLDocument('second')
    secondDocument.documentElement.style.setProperty('--yt-live-chat-background-color', 'rgb(7, 8, 9)', 'important')
    let currentDocument = firstDocument
    Object.defineProperty(iframe, 'contentDocument', {
      get: () => currentDocument,
      configurable: true,
    })
    host.appendChild(iframe)
    document.body.append(host, container)

    attachIframeToContainer(container, iframe)
    currentDocument = secondDocument
    iframe.dispatchEvent(new Event('load'))
    secondDocument.documentElement.style.setProperty('--yt-live-chat-background-color', 'transparent')
    iframe.dispatchEvent(new Event('load'))

    detachAttachedIframe(iframe, container)

    expect(host.contains(iframe)).toBe(true)
    expect(secondDocument.documentElement.style.getPropertyValue('--yt-live-chat-background-color')).toBe('rgb(7, 8, 9)')
    expect(secondDocument.documentElement.style.getPropertyPriority('--yt-live-chat-background-color')).toBe('important')
  })

  it('removes only the membership fallback listener and marker installed by the extension', () => {
    const container = document.createElement('div') as HTMLDivElement
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    const doc = document.implementation.createHTMLDocument('chat')
    const item = doc.createElement('yt-live-chat-product-picker-panel-item-view-model')
    item.setAttribute('item-id', 'Membership')
    const endpoint = doc.createElement('a')
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
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })
    host.appendChild(iframe)
    document.body.append(host, container)
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    attachIframeToContainer(container, iframe)
    installMembershipFallback(doc)
    endpoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(doc.body.getAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe('true')

    detachAttachedIframe(iframe, container)
    endpoint.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(host.contains(iframe)).toBe(true)
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(doc.body.hasAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe(false)
  })

  it('preserves a pre-existing membership fallback marker when restoring native chat', () => {
    const container = document.createElement('div') as HTMLDivElement
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    const doc = document.implementation.createHTMLDocument('chat')
    doc.body.setAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR, 'pre-existing')
    Object.defineProperty(iframe, 'contentDocument', {
      value: doc,
      configurable: true,
    })
    host.appendChild(iframe)
    document.body.append(host, container)

    attachIframeToContainer(container, iframe)
    installMembershipFallback(doc)
    detachAttachedIframe(iframe, container)

    expect(doc.body.getAttribute(MEMBERSHIP_FALLBACK_MARKER_ATTR)).toBe('pre-existing')
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

  it('restores a borrowed iframe to a rebuilt host on a channel live entry', () => {
    setLocation('/@lofi/live')
    const watchFlexy = document.createElement('ytd-watch-flexy')
    watchFlexy.setAttribute('video-id', 'video-a')
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const originalHost = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat?v=video-a'
    originalHost.appendChild(iframe)
    originalParent.appendChild(originalHost)
    document.body.append(watchFlexy, originalParent, container)

    attachIframeToContainer(container, iframe)
    originalParent.remove()
    const rebuiltHost = document.createElement('ytd-live-chat-frame')
    rebuiltHost.setAttribute('video-id', 'video-a')
    document.body.appendChild(rebuiltHost)

    detachAttachedIframe(iframe, container)

    expect(rebuiltHost.contains(iframe)).toBe(true)
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
    reconcilePendingNativeIframeRestores()

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
    reconcilePendingNativeIframeRestores()

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
    reconcilePendingNativeIframeRestores()

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

  it('stops native chat open retries after navigation changes the video', () => {
    vi.useFakeTimers()
    const userAgentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Chrome/126.0',
      configurable: true,
    })
    const container = document.createElement('div') as HTMLDivElement
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    iframe.src = 'https://www.youtube.com/live_chat_replay?v=video-a'
    host.appendChild(iframe)
    document.body.append(host, container)

    try {
      attachIframeToContainer(container, iframe)
      detachAttachedIframe(iframe, container, { ensureNativeVisible: true })
      expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)

      setLocation('/watch?v=video-b')
      vi.advanceTimersByTime(500)

      expect(openArchiveNativeChatPanelMock).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
      if (userAgentDescriptor) {
        Object.defineProperty(navigator, 'userAgent', userAgentDescriptor)
      }
    }
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
