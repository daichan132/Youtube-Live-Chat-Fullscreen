import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_PROFILE } from '@/shared/settings/defaults'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl, mutationTouchesChatBoundary } from './ChatRuntime'
import type { ChatDecision } from './resolveChatDecision'
import type { ChatIframeLease } from './resources/ChatIframeLease'
import type { PresentationLease } from './resources/PresentationLease'
import type { ChatSource } from './types'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  },
}))

type TestSnapshot = {
  videoId: string | null
  isWatchPage: boolean
  isFullscreen: boolean
  player: HTMLElement | null
  rightControls: HTMLElement | null
  chatIframe: HTMLIFrameElement | null
}

const createSnapshot = (overrides: Partial<TestSnapshot> = {}): PageObservation => {
  const snapshot: TestSnapshot = {
    videoId: 'video-1',
    isWatchPage: true,
    isFullscreen: true,
    player: document.createElement('div'),
    rightControls: document.createElement('div'),
    chatIframe: null,
    ...overrides,
  }
  return {
    evidence: {
      generation: 0,
      videoId: snapshot.videoId,
      route: snapshot.isWatchPage ? 'watch' : 'other',
      fullscreen: snapshot.isFullscreen,
      videoMode: 'live',
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: snapshot.chatIframe !== null,
        canCreateManagedLiveChat: true,
        canOpenArchiveChat: false,
        canRestoreNativeChat: false,
        canMountOverlay: snapshot.player !== null,
        canMountPlayerSwitch: snapshot.rightControls !== null,
      },
      sourceKind: snapshot.chatIframe ? 'native-live' : null,
      probeIds: [],
    },
    targets: {
      player: snapshot.player,
      fullscreenRoot: snapshot.isFullscreen ? snapshot.player : null,
      rightControls: snapshot.rightControls,
      nativeChatHost: null,
      nativeChatIframe: snapshot.chatIframe,
      chatIframe: snapshot.chatIframe,
      archiveOpenControl: null,
    },
  }
}

const createBorrowSource = (iframe: HTMLIFrameElement, videoId = 'video-1'): ChatSource => ({
  kind: 'live_borrow',
  videoId,
  iframe,
})

const createLease = (iframe: HTMLIFrameElement, videoId = 'video-1'): ChatIframeLease => {
  Object.defineProperty(iframe, 'contentDocument', {
    configurable: true,
    value: document,
  })
  let released = false
  return {
    generation: 1,
    iframe,
    videoId,
    kind: 'borrowed-live',
    ownership: 'borrowed',
    get state() {
      return released ? 'released' : iframe.isConnected ? 'attached' : 'created'
    },
    attach(container) {
      if (!released && iframe.parentElement !== container) container.appendChild(iframe)
    },
    captureDocumentStyle: vi.fn(() => true),
    reconcile: vi.fn(),
    release: vi.fn(() => {
      released = true
      iframe.remove()
    }),
  }
}

const createHarness = (options: { decisions: ChatDecision[]; snapshots?: PageObservation[]; leases?: ChatIframeLease[] }) => {
  let decisionIndex = 0
  let snapshotIndex = 0
  let leaseIndex = 0
  const portalHost: PresentationLease = {
    sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })),
    clear: vi.fn(),
  }
  const defaultSnapshot = createSnapshot()
  const readSnapshot = vi.fn(() => options.snapshots?.[Math.min(snapshotIndex++, options.snapshots.length - 1)] ?? defaultSnapshot)
  const resolveDecision = vi.fn(() => options.decisions[Math.min(decisionIndex++, options.decisions.length - 1)])
  const createLeaseFactory = vi.fn(() => {
    const lease = options.leases?.[Math.min(leaseIndex++, options.leases.length - 1)]
    if (!lease) throw new Error('missing test lease')
    return lease
  })
  const runtime = new ChatRuntimeImpl({
    portalHost,
    readObservation: readSnapshot,
    resolveDecision,
    createLease: createLeaseFactory,
  })
  const carrier = document.createElement('div')
  document.body.appendChild(carrier)
  runtime.start()
  runtime.setEnabled(true)
  runtime.setProfile(DEFAULT_CHAT_PROFILE)
  runtime.setOverlayContainer(carrier)

  return { runtime, portalHost, readSnapshot, resolveDecision, createLeaseFactory, carrier }
}

const flushFrame = () => {
  vi.advanceTimersByTime(20)
}

const dispatchNavigation = () => {
  document.dispatchEvent(new Event('yt-navigate-finish'))
  flushFrame()
}

describe('ChatRuntime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/live_chat?v=video-1')
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.replaceChildren()
    document.head.querySelectorAll('[data-ylc-iframe-style="true"], #custom-font-style').forEach(element => {
      element.remove()
    })
  })

  it('ignores unrelated mutations inside the player while observing boundary replacement', () => {
    const player = document.createElement('div')
    player.id = 'movie_player'
    const controls = document.createElement('div')
    controls.className = 'ytp-chrome-bottom'
    const animatedLabel = document.createElement('span')
    controls.appendChild(animatedLabel)
    player.appendChild(controls)

    const irrelevantMutation = {
      type: 'attributes',
      target: animatedLabel,
    } as unknown as MutationRecord
    expect(mutationTouchesChatBoundary(irrelevantMutation)).toBe(false)

    const rightControls = document.createElement('div')
    rightControls.className = 'ytp-right-controls'
    const boundaryMutation = {
      type: 'childList',
      target: controls,
      addedNodes: [rightControls],
      removedNodes: [],
    } as unknown as MutationRecord
    expect(mutationTouchesChatBoundary(boundaryMutation)).toBe(true)
  })

  it('keeps the same iframe lease through a temporary source loss', () => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=video-1'
    const lease = createLease(iframe)
    const available: ChatDecision = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: createBorrowSource(iframe),
    }
    const harness = createHarness({
      decisions: [available, { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: true }, available],
      leases: [lease],
    })

    flushFrame()
    expect(harness.runtime.getSnapshot().status).toBe('active')
    const attachedIdentity = harness.carrier.querySelector('iframe')

    dispatchNavigation()
    expect(harness.runtime.getSnapshot().status).toBe('recovering')
    expect(lease.release).not.toHaveBeenCalled()

    dispatchNavigation()
    expect(harness.runtime.getSnapshot().status).toBe('active')
    expect(harness.carrier.querySelector('iframe')).toBe(attachedIdentity)
    expect(harness.createLeaseFactory).toHaveBeenCalledTimes(1)
    harness.runtime.stop()
  })

  it('releases the old lease before attaching a different video', () => {
    const firstIframe = document.createElement('iframe')
    firstIframe.src = '/live_chat?v=video-1'
    const secondIframe = document.createElement('iframe')
    secondIframe.src = '/live_chat?v=video-2'
    const firstLease = createLease(firstIframe, 'video-1')
    const secondLease = createLease(secondIframe, 'video-2')
    const harness = createHarness({
      decisions: [
        {
          kind: 'available',
          videoId: 'video-1',
          mode: 'live',
          source: createBorrowSource(firstIframe),
        },
        {
          kind: 'available',
          videoId: 'video-2',
          mode: 'live',
          source: createBorrowSource(secondIframe, 'video-2'),
        },
      ],
      snapshots: [createSnapshot(), createSnapshot({ videoId: 'video-2', chatIframe: secondIframe })],
      leases: [firstLease, secondLease],
    })

    flushFrame()
    dispatchNavigation()

    expect(firstLease.release).toHaveBeenCalledTimes(1)
    expect(vi.mocked(firstLease.release).mock.invocationCallOrder[0]).toBeLessThan(harness.createLeaseFactory.mock.invocationCallOrder[1])
    expect(harness.carrier.querySelector('iframe')).toBe(secondIframe)
    harness.runtime.stop()
  })

  it('cancels retry callbacks owned by the previous video generation', () => {
    const firstPlayer = document.createElement('div')
    const secondPlayer = document.createElement('div')
    const harness = createHarness({
      decisions: [
        { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: false },
        { kind: 'pending', videoId: 'video-2', mode: 'live', canToggle: false },
      ],
      snapshots: [createSnapshot({ player: firstPlayer }), createSnapshot({ videoId: 'video-2', player: secondPlayer })],
    })

    flushFrame()
    expect(harness.runtime.getGeneration()).toBe(1)

    dispatchNavigation()
    expect(harness.runtime.getGeneration()).toBe(2)

    vi.advanceTimersByTime(250)

    expect(harness.readSnapshot).toHaveBeenCalledTimes(3)
    harness.runtime.stop()
  })

  it('releases old resources before a player and iframe replacement for the same video', () => {
    const firstIframe = document.createElement('iframe')
    firstIframe.src = '/live_chat?v=video-1'
    const secondIframe = document.createElement('iframe')
    secondIframe.src = '/live_chat?v=video-1&source=replacement'
    const firstLease = createLease(firstIframe)
    const secondLease = createLease(secondIframe)
    const harness = createHarness({
      decisions: [
        {
          kind: 'available',
          videoId: 'video-1',
          mode: 'live',
          source: createBorrowSource(firstIframe),
        },
        {
          kind: 'available',
          videoId: 'video-1',
          mode: 'live',
          source: createBorrowSource(secondIframe),
        },
      ],
      snapshots: [createSnapshot({ chatIframe: firstIframe }), createSnapshot({ chatIframe: secondIframe })],
      leases: [firstLease, secondLease],
    })

    flushFrame()
    dispatchNavigation()

    expect(firstLease.release).toHaveBeenCalledTimes(1)
    expect(vi.mocked(firstLease.release).mock.invocationCallOrder[0]).toBeLessThan(harness.createLeaseFactory.mock.invocationCallOrder[1])
    expect(harness.createLeaseFactory).toHaveBeenCalledTimes(2)
    expect(harness.runtime.getGeneration()).toBe(2)
    expect(harness.portalHost.clear).toHaveBeenCalled()
    expect(harness.carrier.querySelectorAll('iframe')).toHaveLength(1)
    expect(harness.carrier.querySelector('iframe')).toBe(secondIframe)
    harness.runtime.stop()
  })

  it('releases the lease but keeps the switch available when the user turns chat off', () => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=video-1'
    const lease = createLease(iframe)
    const available: ChatDecision = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'archive',
      source: { kind: 'archive_borrow', iframe },
    }
    const harness = createHarness({
      decisions: [available, available],
      leases: [lease],
    })

    flushFrame()
    expect(harness.runtime.getSnapshot().status).toBe('active')

    harness.runtime.setEnabled(false)
    flushFrame()

    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(harness.runtime.getSnapshot()).toMatchObject({
      status: 'inactive',
      showSwitch: true,
      showOverlay: false,
    })
    expect(harness.portalHost.sync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        overlayEnabled: true,
        switchEnabled: true,
      }),
    )
    harness.runtime.stop()
  })

  it('does not create a lease or portal for a no-chat video', () => {
    const harness = createHarness({
      decisions: [{ kind: 'unavailable', videoId: 'video-1' }],
    })

    flushFrame()

    expect(harness.runtime.getSnapshot()).toMatchObject({
      status: 'unavailable',
      showSwitch: false,
      showOverlay: false,
    })
    expect(harness.createLeaseFactory).not.toHaveBeenCalled()
    harness.runtime.stop()
  })

  it('disconnects the page and iframe observers and clears runtime-owned DOM on fullscreen exit', () => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=video-1'
    const lease = createLease(iframe)
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const harness = createHarness({
      decisions: [
        {
          kind: 'available',
          videoId: 'video-1',
          mode: 'archive',
          source: { kind: 'archive_borrow', iframe },
        },
        { kind: 'inactive', reason: 'not-fullscreen' },
      ],
      snapshots: [createSnapshot(), createSnapshot({ isFullscreen: false })],
      leases: [lease],
    })

    flushFrame()
    expect(document.documentElement).toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).not.toBeNull()
    document.dispatchEvent(new Event('fullscreenchange'))
    flushFrame()

    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(disconnect.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(harness.portalHost.clear).toHaveBeenCalled()
    expect(harness.runtime.getSnapshot().status).toBe('inactive')
    expect(vi.getTimerCount()).toBe(0)
    expect(document.documentElement).not.toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).toBeNull()
    harness.runtime.stop()
    disconnect.mockRestore()
  })

  it('uses backoff only while searching and stops after the retry limit', () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval')
    const harness = createHarness({
      decisions: [{ kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: false }],
    })

    vi.runAllTimers()

    expect(harness.runtime.getSnapshot().status).toBe('unavailable')
    expect(setIntervalSpy).not.toHaveBeenCalled()
    harness.runtime.stop()
    setIntervalSpy.mockRestore()
  })

  it('physically disables portal hosts when retry exhaustion becomes unavailable', () => {
    const harness = createHarness({
      decisions: [{ kind: 'pending', videoId: 'video-1', mode: 'archive', canToggle: true }],
    })

    vi.runAllTimers()

    expect(harness.runtime.getSnapshot()).toMatchObject({
      status: 'unavailable',
      showSwitch: false,
      showOverlay: false,
    })
    expect(harness.portalHost.clear).toHaveBeenCalled()
    harness.runtime.stop()
  })

  it('cleans timers, observers, the lease, and runtime-owned DOM on stop', () => {
    const iframe = document.createElement('iframe')
    iframe.src = '/live_chat?v=video-1'
    const lease = createLease(iframe)
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const available: ChatDecision = {
      kind: 'available',
      videoId: 'video-1',
      mode: 'live',
      source: createBorrowSource(iframe),
    }
    const harness = createHarness({
      decisions: [available, { kind: 'pending', videoId: 'video-1', mode: 'live', canToggle: true }],
      leases: [lease],
    })

    flushFrame()
    dispatchNavigation()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    expect(harness.carrier.querySelector('iframe')).toBe(iframe)
    expect(document.documentElement).toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).not.toBeNull()

    harness.runtime.stop()

    expect(lease.release).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalled()
    expect(harness.portalHost.clear).toHaveBeenCalled()
    expect(harness.carrier.querySelector('iframe')).toBeNull()
    expect(harness.runtime.getSnapshot()).toEqual({
      status: 'inactive',
      mode: null,
      showSwitch: false,
      showOverlay: false,
      loading: false,
      overlayRoot: null,
      switchContainer: null,
    })
    expect(vi.getTimerCount()).toBe(0)
    expect(document.documentElement).not.toHaveClass('ylc-fullscreen-chat-fix')
    expect(document.getElementById('ylc-fullscreen-chat-layout-fix')).toBeNull()
    disconnect.mockRestore()
  })
})
