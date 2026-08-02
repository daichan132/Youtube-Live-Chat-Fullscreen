import type { PageEvidence } from '../platform/youtube/types'
import type { ResourceDiagnosticSnapshot } from '../runtime/ResourceReconciler'
import type { RuntimeState } from '../runtime/runtimeModel'
import { assessCompatibilityFingerprint, buildCompatibilityFingerprint, type CompatibilityFingerprint } from './compatibilityFingerprint'
import type { RuntimeFailureCode } from './failureCodes'
import type { DiagnosticEvent } from './RuntimeTrace'

export type BrowserFamily = 'chrome' | 'firefox' | 'other'

export type SanitizedDiagnosticReport = {
  schemaVersion: 1
  extensionVersion: string
  browserFamily: BrowserFamily
  page: {
    mode: CompatibilityFingerprint['mode']
    fullscreen: boolean
    capabilities: PageEvidence['capabilities']
    probeIds: readonly string[]
  }
  runtime: {
    generation: number
    status: RuntimeState['status']
    leases: ResourceDiagnosticSnapshot
    failureCode?: RuntimeFailureCode
  }
  compatibility: {
    fingerprint: CompatibilityFingerprint
    state: 'passed' | 'degraded' | 'failed'
    reasons: readonly string[]
  }
  events: readonly DiagnosticEvent[]
}

export const detectBrowserFamily = (userAgent: string): BrowserFamily => {
  const normalized = userAgent.toLowerCase()
  if (normalized.includes('firefox')) return 'firefox'
  if (normalized.includes('chrome') || normalized.includes('chromium')) return 'chrome'
  return 'other'
}

const emptyEvidence = (generation: number): PageEvidence => ({
  generation,
  videoId: null,
  route: 'other',
  fullscreen: false,
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
})

export const createSanitizedDiagnosticReport = (input: {
  extensionVersion: string
  browserFamily: BrowserFamily
  generation: number
  evidence: PageEvidence | null
  state: RuntimeState
  leases: ResourceDiagnosticSnapshot
  failureCode?: RuntimeFailureCode
  events: readonly DiagnosticEvent[]
}): SanitizedDiagnosticReport => {
  const evidence = input.evidence ?? emptyEvidence(input.generation)
  const fingerprint = buildCompatibilityFingerprint(evidence)
  const assessment = assessCompatibilityFingerprint(fingerprint)
  return {
    schemaVersion: 1,
    extensionVersion: input.extensionVersion,
    browserFamily: input.browserFamily,
    page: {
      mode: fingerprint.mode,
      fullscreen: evidence.fullscreen,
      capabilities: { ...evidence.capabilities },
      probeIds: [...evidence.probeIds],
    },
    runtime: {
      generation: input.generation,
      status: input.state.status,
      leases: input.leases,
      ...(input.failureCode ? { failureCode: input.failureCode } : {}),
    },
    compatibility: {
      fingerprint,
      state: assessment.state,
      reasons: [...assessment.reasons],
    },
    events: input.events.map(event => ({ ...event, probeIds: [...event.probeIds] })),
  }
}
