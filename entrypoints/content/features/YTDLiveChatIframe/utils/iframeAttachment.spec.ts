import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatSource } from '@/entrypoints/content/chat/runtime/types'
import { openArchiveNativeChatPanel } from '@/entrypoints/content/utils/nativeChat'
import { isNativeChatOpen } from '@/entrypoints/content/utils/nativeChatState'
import { attachIframeToContainer, detachAttachedIframe, resolveSourceIframe } from './iframeAttachment'

vi.mock('@/entrypoints/content/utils/nativeChat', () => ({
  openArchiveNativeChatPanel: vi.fn(),
}))

vi.mock('@/entrypoints/content/utils/nativeChatState', () => ({
  isNativeChatOpen: vi.fn(),
}))

const openArchiveNativeChatPanelMock = vi.mocked(openArchiveNativeChatPanel)
const isNativeChatOpenMock = vi.mocked(isNativeChatOpen)

beforeEach(() => {
  document.body.innerHTML = ''
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
    document.body.appendChild(rebuiltHost)

    detachAttachedIframe(iframe, container)

    expect(rebuiltHost.contains(iframe)).toBe(true)
    expect(container.contains(iframe)).toBe(false)
    expect(iframe.getAttribute('data-ylc-chat')).toBeNull()
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
    document.body.appendChild(rebuiltHost)
    await Promise.resolve()
    await Promise.resolve()

    expect(rebuiltHost.contains(iframe)).toBe(true)
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
