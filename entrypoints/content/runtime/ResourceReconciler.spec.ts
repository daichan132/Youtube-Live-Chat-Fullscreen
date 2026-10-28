import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { createSessionScope } from '../bootstrap/SessionScope'
import { ResourceReconciler } from './ResourceReconciler'
import type { ChatDecision } from './resolveChatDecision'
import { type ChatIframeLease, createIframeLease } from './resources/ChatIframeLease'
import type { RuntimePlan } from './runtimeModel'

vi.mock('wxt/browser', () => ({
  browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } },
}))

const createFakeLease = (iframe: HTMLIFrameElement) => {
  let state: ChatIframeLease['state'] = 'created'
  const lease: ChatIframeLease = {
    generation: 1,
    iframe,
    videoId: 'video-1',
    kind: 'borrowed-live',
    ownership: 'borrowed',
    get state() {
      return state
    },
    attach: vi.fn(() => {
      state = 'attached'
    }),
    setBorrowedMode: vi.fn(),
    captureDocumentStyle: vi.fn(() => true),
    reconcile: vi.fn(() => {
      state = 'released'
    }),
    release: vi.fn(() => {
      state = 'released'
    }),
    abandonRestore: vi.fn(() => {
      state = 'released'
    }),
  }
  return { lease }
}

const acquirePlan = (decision: Extract<ChatDecision, { kind: 'available' }>): RuntimePlan => ({
  monitoring: 'active',
  presentation: 'overlay-and-switch',
  chat: { kind: 'acquire', decision },
  layout: 'floating',
  retry: { kind: 'none' },
})

describe('ResourceReconciler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('leaves the native iframe untouched when a pending lease is released before a carrier exists', () => {
    const host = document.createElement('ytd-live-chat-frame')
    const iframe = document.createElement('iframe')
    host.append(iframe)
    document.body.append(host)
    const resources = new ResourceReconciler()
    const scope = createSessionScope(1)
    const plan: RuntimePlan = {
      ...acquirePlan({ kind: 'available', videoId: 'video-1', mode: 'live', source: { kind: 'live_borrow', iframe } }),
      presentation: 'preserve',
      layout: 'none',
    }
    try {
      expect(resources.reconcilePlan(plan, null, scope, vi.fn()).initialization?.success).toBe(false)
      expect(resources.lease?.state).toBe('created')
      resources.reconcilePlan({ ...plan, chat: { kind: 'none', ensureNativeVisible: false } }, null, scope, vi.fn())
      expect(host.contains(iframe)).toBe(true)
      expect(resources.lease).toBeNull()
    } finally {
      resources.clear()
      scope.dispose()
    }
  })

  it('keeps initialization pending for empty native CSS and never re-gates an initialized document', () => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=video-1'
    document.body.append(iframe)
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Missing chat document')
    doc.open()
    doc.write('<html><head><link id="base-css" rel="stylesheet" href="/base.css"></head><body></body></html>')
    doc.close()
    Object.defineProperty(doc, 'readyState', { value: 'complete' })
    const link = doc.getElementById('base-css')
    const rules: CSSRule[] = []
    Object.defineProperty(link, 'sheet', { value: { cssRules: rules } })
    const { lease } = createFakeLease(iframe)
    const resources = new ResourceReconciler({ createLease: () => lease })
    const scope = createSessionScope(1)
    resources.setProfile(DEFAULT_CHAT_PROFILE)
    resources.setOverlayContainer(document.createElement('div'))
    resources.createIframe({ kind: 'available', videoId: 'video-1', mode: 'live', source: { kind: 'live_borrow', iframe } }, 1)
    try {
      expect(resources.initializeIframe(scope, vi.fn())).toBe(false)
      expect(doc.querySelector('style[data-ylc-style-injected]')).toBeNull()
      rules.push({} as CSSRule)
      expect(resources.initializeIframe(scope, vi.fn())).toBe(true)
      expect(doc.querySelectorAll('style[data-ylc-style-injected]')).toHaveLength(1)
      rules.length = 0
      expect(resources.initializeIframe(scope, vi.fn())).toBe(true)
      expect(lease.release).not.toHaveBeenCalled()
      expect(lease.iframe.contentDocument).toBe(doc)
    } finally {
      resources.clear()
      scope.dispose()
    }
  })

  it.each([false, true])(
    'keeps one lease through same-iframe live and replay changes when the original host is missing=%s',
    hostMissing => {
      window.history.replaceState({}, '', '/watch?v=video-1')
      const host = document.createElement('ytd-live-chat-frame')
      host.setAttribute('video-id', 'video-1')
      const iframe = document.createElement('iframe')
      iframe.src = 'https://www.youtube.com/live_chat?v=video-1'
      const makeDocument = (path: string) => {
        const doc = document.implementation.createHTMLDocument('chat')
        doc.body.innerHTML =
          '<yt-live-chat-renderer><yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer></yt-live-chat-renderer>'
        doc.documentElement.style.setProperty('--extension-yt-live-chat-font-size', '37px')
        return new Proxy(doc, {
          get(target, key) {
            if (key === 'location') return { href: `https://www.youtube.com/${path}?v=video-1` }
            const value = Reflect.get(target, key, target)
            return typeof value === 'function' ? value.bind(target) : value
          },
        })
      }
      let currentDocument = makeDocument('live_chat')
      Object.defineProperty(iframe, 'contentDocument', { configurable: true, get: () => currentDocument })
      host.append(iframe)
      const carrier = document.createElement('div')
      document.body.append(host, carrier)
      const createLease = vi.fn(createIframeLease)
      const resources = new ResourceReconciler({ createLease })
      const scope = createSessionScope(1)
      resources.setProfile(DEFAULT_CHAT_PROFILE)
      resources.setOverlayContainer(carrier)
      const makePlan = (decision: Extract<ChatDecision, { kind: 'available' }>): RuntimePlan => ({
        ...acquirePlan(decision),
        presentation: 'preserve',
        layout: 'none',
      })
      const live = makePlan({
        kind: 'available',
        videoId: 'video-1',
        mode: 'live',
        source: { kind: 'live_borrow', iframe },
      })
      const replay = makePlan({ kind: 'available', videoId: 'video-1', mode: 'archive', source: { kind: 'archive_borrow', iframe } })
      const currentHost = hostMissing ? document.createElement('ytd-live-chat-frame') : host
      currentHost.setAttribute('video-id', 'video-1')
      const targets = {
        player: null,
        fullscreenRoot: null,
        rightControls: null,
        nativeChatHost: currentHost,
        nativeChatIframe: iframe,
        chatIframe: iframe,
        archiveOpenControl: null,
      }
      try {
        expect(resources.reconcilePlan(live, null, scope, vi.fn()).initialization?.success).toBe(true)
        const lease = resources.lease
        if (!lease) throw new Error('Expected a borrowed live lease')
        expect(lease.kind).toBe('borrowed-live')
        const context = iframe.contentWindow
        if (hostMissing) host.remove()
        currentDocument = makeDocument('live_chat_replay')
        const replayDocument = iframe.contentDocument
        expect(resources.reconcilePlan(replay, null, scope, vi.fn()).initialization?.success).toBe(true)
        expect(resources.lease).toBe(lease)
        expect(lease.state).toBe('attached')
        expect(resources.getDiagnosticSnapshot().chat.kind).toBe('borrowed-replay')
        expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(0)
        expect(iframe.contentWindow).toBe(context)
        expect(iframe.contentDocument).toBe(replayDocument)
        expect(createLease).toHaveBeenCalledOnce()

        if (hostMissing) document.body.append(currentHost)
        resources.reconcileRestoring(targets)
        expect(carrier.querySelector('iframe')).toBe(iframe)
        expect(currentHost.querySelector('iframe')).toBeNull()
        currentDocument = makeDocument('live_chat')
        const laterLiveDocument = iframe.contentDocument
        expect(resources.reconcilePlan(live, null, scope, vi.fn()).initialization?.success).toBe(true)
        expect(resources.lease).toBe(lease)
        expect(resources.getDiagnosticSnapshot().chat.kind).toBe('borrowed-live')
        expect(iframe.contentWindow).toBe(context)
        expect(iframe.contentDocument).toBe(laterLiveDocument)
        expect(createLease).toHaveBeenCalledOnce()
        resources.clear(targets)
        expect(currentHost.querySelector('iframe')).toBe(iframe)
        expect(laterLiveDocument?.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size')).toBe('37px')
      } finally {
        resources.clear()
        scope.dispose()
      }
    },
  )

  it.each(['live_borrow', 'archive_borrow', 'live_direct'] as const)(
    'retains the exact iframe and lease across repeated %s acquisition plans',
    kind => {
      window.history.replaceState({}, '', '/watch?v=video-1')
      const nativeHost = document.createElement('ytd-live-chat-frame')
      nativeHost.setAttribute('video-id', 'video-1')
      const iframe = document.createElement('iframe')
      iframe.src = `https://www.youtube.com/${kind === 'archive_borrow' ? 'live_chat_replay' : 'live_chat'}?v=video-1`
      nativeHost.append(iframe)
      const carrier = document.createElement('div')
      document.body.append(nativeHost, carrier)
      const createLease = vi.fn(createIframeLease)
      const resources = new ResourceReconciler({ createLease })
      const scope = createSessionScope(1)
      const decision: Extract<ChatDecision, { kind: 'available' }> = {
        kind: 'available',
        videoId: 'video-1',
        mode: kind === 'archive_borrow' ? 'archive' : 'live',
        source:
          kind === 'live_direct'
            ? { kind, url: 'https://www.youtube.com/live_chat?v=video-1' }
            : kind === 'live_borrow'
              ? { kind, iframe }
              : { kind, iframe },
      }
      const plan: RuntimePlan = {
        ...acquirePlan(decision),
        presentation: 'preserve',
        layout: 'none',
      }
      resources.setOverlayContainer(carrier)
      try {
        resources.reconcilePlan(plan, null, scope, vi.fn())
        const firstLease = resources.lease
        const firstIframe = carrier.querySelector('iframe')
        expect(firstLease).not.toBeNull()
        expect(firstIframe).toBe(firstLease?.iframe)

        resources.reconcilePlan(plan, null, scope, vi.fn())

        expect(resources.lease).toBe(firstLease)
        expect(carrier.querySelectorAll('iframe')).toHaveLength(1)
        expect(carrier.querySelector('iframe')).toBe(firstIframe)
        expect(createLease).toHaveBeenCalledOnce()
      } finally {
        try {
          resources.clear()
        } finally {
          scope.dispose()
        }
      }
      if (kind === 'live_direct') expect(carrier.querySelector('iframe')).toBeNull()
      else expect(nativeHost.querySelector('iframe')).toBe(iframe)
    },
  )
})
