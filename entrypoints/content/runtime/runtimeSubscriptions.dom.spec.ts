import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'

const runtimes: ChatRuntimeImpl[] = []
const createRuntime = () => {
  const observation: PageObservation = {
    evidence: {
      generation: 0,
      videoId: 'current-video',
      route: 'watch',
      fullscreen: true,
      videoMode: 'live',
      chatAvailability: 'ready',
      capabilities: {
        canBorrowNativeChat: false,
        canCreateManagedLiveChat: true,
        canOpenArchiveChat: false,
        canRestoreNativeChat: false,
        canMountOverlay: true,
        canMountPlayerSwitch: true,
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
  }
  const readObservation = vi.fn(() => observation)
  const clear = vi.fn()
  const runtime = new ChatRuntimeImpl({
    readObservation,
    resolveDecision: () => ({ kind: 'pending', videoId: 'current-video', mode: 'live', canToggle: true }),
    portalHost: { clear, sync: () => ({ overlayRoot: null, switchContainer: null }) },
  })
  runtimes.push(runtime)
  return { runtime, readObservation, clear }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.stop()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('runtime subscription isolation', () => {
  it('notifies healthy subscribers without restarting resources when one subscriber throws', () => {
    const { runtime, clear, readObservation } = createRuntime()
    const unsubscribe = runtime.subscribe(() => {
      throw new Error('private-notification-data')
    })
    const healthy = vi.fn()
    runtime.subscribe(healthy)
    runtime.start()

    expect(() => vi.advanceTimersByTime(20)).not.toThrow()
    expect(healthy).toHaveBeenCalledOnce()
    expect(runtime.getSnapshot().showSwitch).toBe(true)
    expect(clear).not.toHaveBeenCalled()
    expect(readObservation).toHaveBeenCalledOnce()
    const report = runtime.getDiagnosticReport()
    expect(report.runtime).toMatchObject({ failureCode: 'UNEXPECTED_RUNTIME_ERROR', failureStage: 'publish-view' })
    expect(JSON.stringify(report)).not.toContain('private-notification-data')

    unsubscribe()
    runtime.restart()
    vi.advanceTimersByTime(20)
    expect(runtime.getDiagnosticReport().runtime).not.toHaveProperty('failureStage')
  })

  it('finishes stop and removes page listeners even when notification throws', () => {
    const { runtime, readObservation } = createRuntime()
    runtime.subscribe(() => {
      throw new Error('broken consumer')
    })
    runtime.start()
    vi.advanceTimersByTime(20)

    expect(() => runtime.stop()).not.toThrow()
    document.dispatchEvent(new Event('fullscreenchange'))
    document.dispatchEvent(new Event('yt-navigate-finish'))
    vi.advanceTimersByTime(100)
    expect(readObservation).toHaveBeenCalledOnce()
    expect(runtime.getSnapshot().showSwitch).toBe(false)
  })

  it('defers subscriptions added during delivery and respects removals', () => {
    const { runtime } = createRuntime()
    const added = vi.fn()
    const removed = vi.fn()
    let removeLater: () => void = () => {}
    runtime.subscribe(() => {
      runtime.subscribe(added)
      removeLater()
    })
    removeLater = runtime.subscribe(removed)
    runtime.start()
    vi.advanceTimersByTime(20)

    expect(added).not.toHaveBeenCalled()
    expect(removed).not.toHaveBeenCalled()
    runtime.stop()
    expect(added).toHaveBeenCalledOnce()
  })
})
