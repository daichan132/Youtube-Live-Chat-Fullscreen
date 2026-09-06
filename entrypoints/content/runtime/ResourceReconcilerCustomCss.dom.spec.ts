import { afterEach, describe, expect, it, vi } from 'vitest'
import { IFRAME_CHAT_BODY_CLASS } from '@/entrypoints/content/features/YTDLiveChatIframe/constants/styleContract'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { createSessionScope } from '../bootstrap/SessionScope'
import { ResourceReconciler } from './ResourceReconciler'
import type { ChatIframeLease } from './resources/ChatIframeLease'

const current = vi.hoisted(() => ({ document: null as Document | null }))
vi.mock('@/entrypoints/content/features/YTDLiveChatIframe/utils/iframeInitializer', () => ({
  getIframeDocument: () => current.document,
  ensureStyleInjected: vi.fn(),
  installMembershipFallback: vi.fn(),
}))
vi.mock('@/entrypoints/content/style/applyStylePatch', () => ({ applyChatProfileToDocument: vi.fn() }))

const cleanups: (() => void)[] = []
const source = 'yt-live-chat-text-message-renderer { border-radius: 12px; }'
const ownedStyle = (doc: Document) => doc.querySelector('[data-ylc-user-css]')

const setup = () => {
  const doc = document.implementation.createHTMLDocument('Chat')
  current.document = doc
  const iframe = document.createElement('iframe')
  let state: ChatIframeLease['state'] = 'created'
  const lease: ChatIframeLease = {
    generation: 1,
    iframe,
    videoId: 'video-1',
    kind: 'borrowed-live',
    ownership: 'borrowed',
    get state() { return state },
    attach: vi.fn(() => { state = 'attached' }),
    captureDocumentStyle: vi.fn(() => true),
    reconcile: vi.fn(),
    release: vi.fn(() => {
      // User styling must be gone before the native iframe is returned.
      expect(ownedStyle(doc)).toBeNull()
      state = 'released'
    }),
    abandonRestore: vi.fn(),
  }
  const resources = new ResourceReconciler({
    createLease: () => lease,
    chatChrome: { sync: vi.fn(), release: vi.fn() },
    presentation: { sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })), clear: vi.fn() },
  })
  const scope = createSessionScope(1)
  resources.setProfile(DEFAULT_CHAT_PROFILE)
  resources.setOverlayContainer(document.createElement('div'))
  resources.createIframe({
    kind: 'available',
    videoId: 'video-1',
    mode: 'live',
    source: { kind: 'live_borrow', videoId: 'video-1', iframe },
  }, 1)
  cleanups.push(() => { resources.clear(); scope.dispose() })
  return { doc, iframe, lease, resources, scope }
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  current.document = null
})

describe('custom CSS through the chat lease', () => {
  it('retains CSS requested before initialization and removes it before returning the iframe', () => {
    const { resources, doc, scope, lease } = setup()
    resources.setCustomCss(source)
    expect(ownedStyle(doc)).toBeNull()
    expect(resources.initializeIframe(scope, vi.fn())).toBe(true)
    expect(ownedStyle(doc)?.textContent).toBe(source)
    resources.releaseIframe(null)
    expect(lease.release).toHaveBeenCalled()
    expect(ownedStyle(doc)).toBeNull()
  })

  it('clears the old Document at load, then applies only to the initialized replacement', () => {
    const { resources, doc, scope, iframe } = setup()
    resources.setCustomCss(source)
    const onLoad = vi.fn()
    resources.initializeIframe(scope, onLoad)
    const replacement = document.implementation.createHTMLDocument('Replacement chat')
    current.document = replacement
    iframe.dispatchEvent(new Event('load'))
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(ownedStyle(doc)).toBeNull()
    expect(ownedStyle(replacement)).toBeNull()
    resources.initializeIframe(scope, onLoad)
    expect(ownedStyle(replacement)?.textContent).toBe(source)
  })

  it('never attaches a previous CSS value during a stop at Document replacement', () => {
    const { resources, doc, scope } = setup()
    resources.setCustomCss(source)
    resources.initializeIframe(scope, vi.fn())
    const replacement = document.implementation.createHTMLDocument('Replacement chat')
    replacement.body.classList.add(IFRAME_CHAT_BODY_CLASS)
    current.document = replacement
    const append = vi.spyOn(replacement.head, 'appendChild')
    resources.setCustomCss('')
    expect(ownedStyle(doc)).toBeNull()
    expect(append).not.toHaveBeenCalled()
  })

  it('releases old CSS while the next Document is unavailable, then restores the requested source', () => {
    const { resources, doc, scope } = setup()
    resources.setCustomCss(source)
    resources.initializeIframe(scope, vi.fn())
    current.document = null
    expect(resources.initializeIframe(scope, vi.fn())).toBe(false)
    expect(ownedStyle(doc)).toBeNull()
    current.document = document.implementation.createHTMLDocument('Ready chat')
    expect(resources.initializeIframe(scope, vi.fn())).toBe(true)
    expect(ownedStyle(current.document)?.textContent).toBe(source)
  })
})
