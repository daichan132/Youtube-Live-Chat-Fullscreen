import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSessionScope, type SessionScope } from '../bootstrap/SessionScope'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'
import { ResourceReconciler } from './ResourceReconciler'
import type { ChatDecision } from './resolveChatDecision'
import type { ChatIframeLease } from './resources/ChatIframeLease'

const scopes: SessionScope[] = []
const runtimes: ChatRuntimeImpl[] = []
const makeLease = (state: ChatIframeLease['state'] = 'attached') => ({
  generation: 1,
  iframe: document.createElement('iframe'),
  videoId: 'cleanup-video',
  kind: 'borrowed-live' as const,
  ownership: 'borrowed' as const,
  state,
  attach: vi.fn(),
  captureDocumentStyle: vi.fn(() => true),
  reconcile: vi.fn(),
  release: vi.fn(),
  abandonRestore: vi.fn(),
}) satisfies ChatIframeLease

const decisionFor = (lease: ChatIframeLease): Extract<ChatDecision, { kind: 'available' }> => ({
  kind: 'available',
  videoId: lease.videoId,
  mode: 'live',
  source: { kind: 'live_borrow', videoId: lease.videoId, iframe: lease.iframe },
})

const observation = (): PageObservation => ({
  evidence: {
    generation: 0,
    videoId: 'cleanup-video',
    route: 'watch',
    fullscreen: true,
    videoMode: 'unknown',
    chatAvailability: 'pending',
    capabilities: {
      canBorrowNativeChat: false,
      canCreateManagedLiveChat: false,
      canOpenArchiveChat: false,
      canRestoreNativeChat: false,
      canMountOverlay: false,
      canMountPlayerSwitch: false,
    },
    sourceKind: null,
    probeIds: [],
  },
  targets: {
    player: null,
    fullscreenRoot: null,
    rightControls: null,
    nativeChatHost: null,
    nativeChatIframe: null,
    chatIframe: null,
    archiveOpenControl: null,
  },
})

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.stop()
  for (const scope of scopes.splice(0)) scope.dispose()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('resource cleanup failure isolation', () => {
  it('returns the iframe even when chat chrome cleanup throws', () => {
    const lease = makeLease()
    const chrome = { sync: vi.fn(() => { throw new Error('chrome failed') }), release: vi.fn() }
    const resources = new ResourceReconciler({ createLease: () => lease, chatChrome: chrome })
    resources.createIframe(decisionFor(lease), 1)

    expect(() => resources.releaseIframe(null)).toThrow('chrome failed')
    expect(lease.release).toHaveBeenCalledOnce()
    expect(resources.lease).toBeNull()
  })

  it('attempts layout, presentation and chrome cleanup after iframe release fails', () => {
    const lease = makeLease()
    lease.release.mockImplementationOnce(() => { throw new Error('iframe failed') })
    const layout = { reconcile: vi.fn(), release: vi.fn() }
    const presentation = { sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })), clear: vi.fn() }
    const chrome = { sync: vi.fn(), release: vi.fn() }
    const resources = new ResourceReconciler({ createLease: () => lease, createLayout: () => layout, presentation, chatChrome: chrome })
    const scope = createSessionScope(1)
    scopes.push(scope)
    resources.reconcilePlan({
      monitoring: 'active', presentation: 'preserve', chat: { kind: 'preserve' }, layout: 'floating', retry: { kind: 'none' },
    }, null, scope, vi.fn())
    resources.createIframe(decisionFor(lease), 1)

    expect(() => resources.clear()).toThrow('iframe failed')
    expect(layout.release).toHaveBeenCalledOnce()
    expect(presentation.clear).toHaveBeenCalledOnce()
    expect(chrome.release).toHaveBeenCalledOnce()
    expect(resources.lease).toBe(lease)
    expect(() => resources.clear()).not.toThrow()
    expect(resources.lease).toBeNull()
  })

  it('does not abandon later restoration cleanup when an earlier lease throws', () => {
    const first = makeLease('restoring')
    const second = makeLease('restoring')
    first.abandonRestore.mockImplementationOnce(() => { throw new Error('restore failed') })
    const createLease = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const resources = new ResourceReconciler({ createLease, chatChrome: { sync: vi.fn(), release: vi.fn() } })
    resources.createIframe(decisionFor(first), 1)
    resources.releaseIframe(null)
    resources.createIframe(decisionFor(second), 1)
    resources.releaseIframe(null)

    expect(() => resources.clear()).toThrow('restore failed')
    expect(second.abandonRestore).toHaveBeenCalledOnce()
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(1)
    expect(() => resources.clear()).not.toThrow()
    expect(resources.getDiagnosticSnapshot().restoringChatCount).toBe(0)
  })

  it('still disposes timers, observers and content listeners when stop cleanup keeps failing', () => {
    vi.useFakeTimers()
    const readObservation = vi.fn(observation)
    const clear = vi.fn()
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect')
    const removeListener = vi.spyOn(document, 'removeEventListener')
    const runtime = new ChatRuntimeImpl({ readObservation, portalHost: { sync: () => ({ overlayRoot: null, switchContainer: null }), clear } })
    runtimes.push(runtime)
    runtime.setEnabled(true)
    runtime.start()
    vi.advanceTimersByTime(20)
    const reads = readObservation.mock.calls.length
    clear.mockImplementation(() => { throw new Error('page node cleanup failed') })

    expect(() => runtime.stop()).not.toThrow()
    expect(disconnect).toHaveBeenCalled()
    expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function), true)
    expect(vi.getTimerCount()).toBe(0)
    document.dispatchEvent(new Event('yt-navigate-finish'))
    vi.runAllTimers()
    expect(readObservation).toHaveBeenCalledTimes(reads)
    expect(runtime.getDiagnosticReport().runtime).toMatchObject({ failureCode: 'UNEXPECTED_RUNTIME_ERROR', failureStage: 'apply-resources' })
  })

  it('can restart after a transient teardown failure without losing its diagnostic', () => {
    vi.useFakeTimers()
    const readObservation = vi.fn(observation)
    const clear = vi.fn()
    const runtime = new ChatRuntimeImpl({ readObservation, portalHost: { sync: () => ({ overlayRoot: null, switchContainer: null }), clear } })
    runtimes.push(runtime)
    runtime.start()
    vi.advanceTimersByTime(20)
    const generation = runtime.getGeneration()
    clear.mockImplementationOnce(() => { throw new Error('transient cleanup failure') })

    expect(() => runtime.restart()).not.toThrow()
    expect(runtime.getDiagnosticReport().runtime.failureStage).toBe('apply-resources')
    vi.advanceTimersByTime(20)
    expect(runtime.getGeneration()).toBeGreaterThan(generation)
  })
})
