import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'
import type { PresentationLease } from './resources/PresentationLease'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      getManifest: () => ({ version: '2.3.15' }),
    },
  },
}))

const observation = (): PageObservation => {
  const player = document.createElement('div')
  return {
    evidence: {
      generation: 0,
      videoId: 'video-1',
      route: 'watch',
      fullscreen: false,
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
      player,
      fullscreenRoot: null,
      rightControls: document.createElement('div'),
      nativeChatHost: null,
      nativeChatIframe: null,
      chatIframe: null,
      archiveOpenControl: null,
    },
  }
}

const flushFrame = () => vi.advanceTimersByTime(20)

const createPortalHost = (): PresentationLease => ({
  sync: vi.fn(() => ({ overlayRoot: null, switchContainer: null })),
  clear: vi.fn(),
})

describe('ChatRuntime unexpected error recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.replaceChildren()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('releases resources and retries once after a transient observation error', () => {
    const portalHost = createPortalHost()
    const readObservation = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('YouTube replaced the watch surface')
      })
      .mockReturnValue(observation())
    const runtime = new ChatRuntimeImpl({
      portalHost,
      readObservation,
      resolveDecision: () => ({ kind: 'inactive', reason: 'not-fullscreen' }),
    })

    runtime.start()
    runtime.setEnabled(true)
    flushFrame()

    expect(runtime.getDiagnosticReport().runtime.failureCode).toBe('UNEXPECTED_RUNTIME_ERROR')
    expect(portalHost.clear).toHaveBeenCalled()

    flushFrame()
    expect(readObservation).toHaveBeenCalledTimes(2)
    expect(runtime.getSnapshot().status).toBe('inactive')
    runtime.stop()
  })

  it('does not enter an unbounded retry loop after repeated errors', () => {
    const readObservation = vi.fn(() => {
      throw new Error('persistent adapter failure')
    })
    const runtime = new ChatRuntimeImpl({ readObservation })

    runtime.start()
    flushFrame()
    flushFrame()
    vi.runAllTimers()

    expect(readObservation).toHaveBeenCalledTimes(2)
    runtime.stop()
  })

  it('cancels the scheduled recovery when stopped', () => {
    const readObservation = vi.fn(() => {
      throw new Error('transient adapter failure')
    })
    const runtime = new ChatRuntimeImpl({ readObservation })

    runtime.start()
    flushFrame()
    expect(readObservation).toHaveBeenCalledOnce()

    runtime.stop()
    vi.runAllTimers()
    expect(readObservation).toHaveBeenCalledOnce()
  })
})
