import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import { createSessionScope } from '../bootstrap/SessionScope'
import type { PageObservation } from '../platform/youtube/types'
import { ResourceReconciler } from './ResourceReconciler'
import type { ChatDecision } from './resolveChatDecision'
import type { ChatChromeLease } from './resources/ChatChromeLease'
import { type ChatIframeLease, createIframeLease } from './resources/ChatIframeLease'
import type { PlayerLayoutLease } from './resources/PlayerLayoutLease'
import type { PresentationLease } from './resources/PresentationLease'
import type { RuntimePlan } from './runtimeModel'

vi.mock('wxt/browser', () => ({
  browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } },
}))

const createObservation = (player = document.createElement('div')): PageObservation => ({
  evidence: {
    generation: 1,
    videoId: 'video-1',
    route: 'watch',
    fullscreen: true,
    videoMode: 'live',
    chatAvailability: 'ready',
    capabilities: {
      canBorrowNativeChat: true,
      canCreateManagedLiveChat: true,
      canOpenArchiveChat: false,
      canRestoreNativeChat: true,
      canMountOverlay: true,
      canMountPlayerSwitch: true,
    },
    sourceKind: 'native-live',
    probeIds: [],
  },
  targets: {
    player,
    fullscreenRoot: player,
    rightControls: document.createElement('div'),
    nativeChatHost: null,
    nativeChatIframe: null,
    chatIframe: null,
    archiveOpenControl: null,
  },
})

const createFakeLease = (log: string[], iframe = document.createElement('iframe')) => {
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
      log.push('iframe-acquire')
    }),
    captureDocumentStyle: vi.fn(() => true),
    reconcile: vi.fn(() => {
      state = 'released'
      log.push('iframe-restored')
    }),
    release: vi.fn(() => {
      state = 'released'
      log.push('iframe-release')
    }),
    abandonRestore: vi.fn(() => {
      state = 'released'
      log.push('iframe-abandoned')
    }),
  }
  return { lease, setState: (next: ChatIframeLease['state']) => (state = next) }
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

  it('acquires presentation and layout before attaching the iframe', () => {
    const log: string[] = []
    const fake = createFakeLease(log)
    const presentation: PresentationLease = {
      sync: vi.fn(() => {
        log.push('presentation-acquire')
        return { overlayRoot: null, switchContainer: null }
      }),
      clear: vi.fn(),
    }
    const layout: PlayerLayoutLease = {
      reconcile: vi.fn(active => {
        if (active) log.push('layout-acquire')
      }),
      release: vi.fn(),
    }
    const chatChrome: ChatChromeLease = { sync: vi.fn(), release: vi.fn() }
    const resources = new ResourceReconciler({
      presentation,
      chatChrome,
      createLease: () => fake.lease,
      createLayout: () => layout,
    })
    const observation = createObservation()
    const decision: Extract<ChatDecision, { kind: 'available' }> = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: { kind: 'live_borrow', videoId: 'video-1', iframe: fake.lease.iframe },
    }
    const scope = createSessionScope(1)

    resources.setProfile(DEFAULT_CHAT_PROFILE)
    resources.setOverlayContainer(document.createElement('div'))
    resources.reconcilePlan(acquirePlan(decision), observation, scope, vi.fn())

    expect(log.slice(0, 3)).toEqual(['presentation-acquire', 'layout-acquire', 'iframe-acquire'])
    resources.clear(observation.targets)
    scope.dispose()
  })

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
            ? { kind, videoId: 'video-1', url: 'https://www.youtube.com/live_chat?v=video-1' }
            : kind === 'live_borrow'
              ? { kind, videoId: 'video-1', iframe }
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

  it('does not request an overlay root for switch-only presentation', () => {
    const presentation: PresentationLease = {
      sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })),
      clear: vi.fn(),
    }
    const resources = new ResourceReconciler({
      presentation,
      chatChrome: { sync: vi.fn(), release: vi.fn() },
    })
    const observation = createObservation()

    resources.reconcilePlan(
      {
        monitoring: 'active',
        presentation: 'switch-only',
        chat: { kind: 'preserve' },
        layout: 'none',
        retry: { kind: 'preserve' },
      },
      observation,
      null,
      vi.fn(),
    )

    expect(presentation.sync).toHaveBeenCalledWith({
      player: observation.targets.player,
      rightControls: observation.targets.rightControls,
      overlayEnabled: false,
      switchEnabled: true,
    })
  })

  it('releases iframe, layout, and presentation in restoration order', () => {
    const log: string[] = []
    const fake = createFakeLease(log)
    const presentation: PresentationLease = {
      sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })),
      clear: vi.fn(() => log.push('presentation-release')),
    }
    const layout: PlayerLayoutLease = {
      reconcile: vi.fn(),
      release: vi.fn(() => log.push('layout-release')),
    }
    const resources = new ResourceReconciler({
      presentation,
      chatChrome: { sync: vi.fn(), release: vi.fn() },
      createLease: () => fake.lease,
      createLayout: () => layout,
    })
    const observation = createObservation()
    const scope = createSessionScope(1)
    const decision: Extract<ChatDecision, { kind: 'available' }> = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: { kind: 'live_borrow', videoId: 'video-1', iframe: fake.lease.iframe },
    }
    resources.reconcilePlan(acquirePlan(decision), observation, scope, vi.fn())
    log.length = 0

    resources.reconcilePlan(
      {
        monitoring: 'inactive',
        presentation: 'none',
        chat: { kind: 'none', ensureNativeVisible: false },
        layout: 'none',
        retry: { kind: 'none' },
      },
      observation,
      scope,
      vi.fn(),
    )

    expect(log).toEqual(['iframe-release', 'layout-release', 'presentation-release'])
    scope.dispose()
  })

  it('keeps a restoring lease instance-scoped until a later observation can finish it', () => {
    const log: string[] = []
    const fake = createFakeLease(log)
    vi.mocked(fake.lease.release).mockImplementation(() => {
      fake.setState('restoring')
      log.push('iframe-release')
    })
    const resources = new ResourceReconciler({
      presentation: { sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })), clear: vi.fn() },
      chatChrome: { sync: vi.fn(), release: vi.fn() },
      createLease: () => fake.lease,
    })
    const observation = createObservation()
    resources.createIframe(
      {
        kind: 'available',
        videoId: 'video-1',
        mode: 'live',
        source: { kind: 'live_borrow', videoId: 'video-1', iframe: fake.lease.iframe },
      },
      1,
    )

    resources.releaseIframe(observation.targets)
    expect(resources.lease).toBeNull()
    resources.reconcileRestoring(observation.targets)
    resources.reconcileRestoring(observation.targets)

    expect(fake.lease.reconcile).toHaveBeenCalledTimes(1)
    expect(log).toEqual(['iframe-release', 'iframe-restored'])
  })

  it('disposes an unrestorable iframe when runtime monitoring stops', () => {
    const log: string[] = []
    const fake = createFakeLease(log)
    vi.mocked(fake.lease.release).mockImplementation(() => {
      fake.setState('restoring')
      log.push('iframe-release')
    })
    const resources = new ResourceReconciler({
      presentation: { sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })), clear: vi.fn() },
      chatChrome: { sync: vi.fn(), release: vi.fn() },
      createLease: () => fake.lease,
    })
    const observation = createObservation()
    resources.createIframe(
      {
        kind: 'available',
        videoId: 'video-1',
        mode: 'live',
        source: { kind: 'live_borrow', videoId: 'video-1', iframe: fake.lease.iframe },
      },
      1,
    )

    resources.reconcilePlan(
      {
        monitoring: 'inactive',
        presentation: 'none',
        chat: { kind: 'none', ensureNativeVisible: false },
        layout: 'none',
        retry: { kind: 'none' },
      },
      observation,
      null,
      vi.fn(),
    )

    expect(fake.lease.abandonRestore).toHaveBeenCalledOnce()
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(0)
  })
})
