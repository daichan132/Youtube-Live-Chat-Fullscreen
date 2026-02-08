import { beforeEach, describe, expect, it } from 'vitest'
import type { ChatSource } from './chatSourceResolver'
import { attachIframeToContainer, detachAttachedIframe, resolveSourceIframe } from './iframeAttachment'

beforeEach(() => {
  document.body.innerHTML = ''
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

  it('moves and restores only native iframe when borrowing archive source', () => {
    const container = document.createElement('div') as HTMLDivElement
    const originalParent = document.createElement('div')
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe') as HTMLIFrameElement
    const sentinel = document.createElement('div')
    sentinel.id = 'sentinel'

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
