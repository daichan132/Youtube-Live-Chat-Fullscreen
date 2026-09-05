import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeFailureStage } from '../diagnostics/failureCodes'
import { createSanitizedDiagnosticReport } from '../diagnostics/sanitizeDiagnosticReport'
import type { PageObservation } from '../platform/youtube/types'
import { ChatRuntimeImpl } from './ChatRuntime'
import type { ChatDecision } from './resolveChatDecision'
import type { PresentationLease } from './resources/PresentationLease'

const createObservation = (): PageObservation => ({
  evidence: {
    generation: 0,
    videoId: 'private-video',
    route: 'watch',
    fullscreen: false,
    videoMode: 'live',
    chatAvailability: 'ready',
    capabilities: {
      canBorrowNativeChat: false,
      canCreateManagedLiveChat: true,
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

const runtimes: ChatRuntimeImpl[] = []
const error = () => {
  throw new Error('https://www.youtube.com/watch?v=private-video private-chat-text')
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.stop()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('runtime failure diagnostics', () => {
  it.each(['observe-page', 'resolve-decision', 'apply-resources'] as const)('reports %s without exporting exception contents', stage => {
    const readObservation = vi.fn(createObservation)
    const resolveDecision = vi.fn((): ChatDecision => ({ kind: 'inactive', reason: 'not-fullscreen' }))
    const clear = vi.fn()
    const portalHost: PresentationLease = {
      clear,
      sync: () => ({ overlayRoot: null, switchContainer: null }),
    }
    if (stage === 'observe-page') readObservation.mockImplementationOnce(error)
    if (stage === 'resolve-decision') resolveDecision.mockImplementationOnce(error)
    if (stage === 'apply-resources') clear.mockImplementationOnce(error)
    const runtime = new ChatRuntimeImpl({ readObservation, resolveDecision, portalHost })
    runtimes.push(runtime)
    runtime.start()
    vi.advanceTimersByTime(20)

    const report = runtime.getDiagnosticReport()
    expect(report.runtime).toMatchObject({ failureCode: 'UNEXPECTED_RUNTIME_ERROR', failureStage: stage })
    expect(JSON.stringify(report)).not.toMatch(/private-video|private-chat-text|https:\/\//)

    runtime.restart()
    expect(runtime.getDiagnosticReport().runtime).not.toHaveProperty('failureStage')
  })

  it('omits unrecognized stages and stages unrelated to an unexpected error', () => {
    const input = {
      extensionVersion: 'test',
      browserFamily: 'chrome' as const,
      generation: 1,
      evidence: null,
      state: { status: 'inactive' as const, reason: 'disabled' as const },
      leases: {
        chat: { kind: 'none' as const, state: 'none' as const },
        presentation: 'none' as const,
        layout: 'none' as const,
        restoringChatCount: 0,
      },
      events: [],
    }
    const unexpected = createSanitizedDiagnosticReport({
      ...input,
      failureCode: 'UNEXPECTED_RUNTIME_ERROR',
      failureStage: 'private-data' as RuntimeFailureStage,
    })
    const pending = createSanitizedDiagnosticReport({ ...input, failureCode: 'CHAT_SOURCE_PENDING', failureStage: 'observe-page' })
    expect(unexpected.runtime).not.toHaveProperty('failureStage')
    expect(pending.runtime).not.toHaveProperty('failureStage')
  })
})
