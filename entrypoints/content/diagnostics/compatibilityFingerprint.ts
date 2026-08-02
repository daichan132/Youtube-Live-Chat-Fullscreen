import type { PageEvidence } from '../platform/youtube/types'

export type CompatibilityFingerprint = {
  playerProbe: string | null
  controlsProbe: string | null
  chatProbe: string | null
  archiveControlProbe: string | null
  mode: 'live' | 'archive' | 'no-chat' | 'unknown'
  source: 'borrowed-live' | 'borrowed-replay' | 'managed-live' | null
  capabilities: {
    overlay: boolean
    playerSwitch: boolean
    nativeRestore: boolean
  }
}

export type CompatibilityAssessment = {
  state: 'passed' | 'degraded' | 'failed'
  reasons: readonly string[]
}

const findProbe = (probeIds: readonly string[], prefix: string) => probeIds.find(probeId => probeId.startsWith(prefix)) ?? null

const sourceFromEvidence = (sourceKind: PageEvidence['sourceKind']): CompatibilityFingerprint['source'] => {
  if (sourceKind === 'native-live') return 'borrowed-live'
  if (sourceKind === 'native-replay') return 'borrowed-replay'
  if (sourceKind === 'managed-live') return 'managed-live'
  return null
}

const modeFromEvidence = (evidence: PageEvidence): CompatibilityFingerprint['mode'] => {
  if (evidence.chatAvailability === 'unavailable') return 'no-chat'
  if (evidence.videoMode === 'live' || evidence.videoMode === 'archive') return evidence.videoMode
  return 'unknown'
}

export const buildCompatibilityFingerprint = (evidence: PageEvidence): CompatibilityFingerprint => ({
  playerProbe: findProbe(evidence.probeIds, 'player.'),
  controlsProbe: findProbe(evidence.probeIds, 'controls.right.'),
  chatProbe: findProbe(evidence.probeIds, 'chat.iframe.'),
  archiveControlProbe: findProbe(evidence.probeIds, 'chat.archive.sidebar.') ?? findProbe(evidence.probeIds, 'chat.archive.player.'),
  mode: modeFromEvidence(evidence),
  source: sourceFromEvidence(evidence.sourceKind),
  capabilities: {
    overlay: evidence.capabilities.canMountOverlay,
    playerSwitch: evidence.capabilities.canMountPlayerSwitch,
    nativeRestore: evidence.capabilities.canRestoreNativeChat,
  },
})

const usesFallbackProbe = (probeId: string | null) => probeId !== null && !probeId.endsWith('.1')

export const assessCompatibilityFingerprint = (fingerprint: CompatibilityFingerprint): CompatibilityAssessment => {
  const reasons: string[] = []
  if (!fingerprint.playerProbe) reasons.push('player probe missing')
  if (fingerprint.mode === 'unknown') reasons.push('video mode unknown')
  if (fingerprint.mode === 'live' || fingerprint.mode === 'archive') {
    if (!fingerprint.capabilities.overlay) reasons.push('overlay capability missing')
    if (!fingerprint.capabilities.playerSwitch) reasons.push('player switch capability missing')
    if (!fingerprint.source) reasons.push('chat source missing')
  }
  if (fingerprint.mode === 'archive' && fingerprint.source === 'borrowed-replay' && !fingerprint.capabilities.nativeRestore) {
    reasons.push('native restore capability missing')
  }
  if (reasons.length > 0) return { state: 'failed', reasons }

  const fallbackFields = [
    ['player', fingerprint.playerProbe],
    ['controls', fingerprint.controlsProbe],
    ['chat', fingerprint.chatProbe],
    ['archive control', fingerprint.archiveControlProbe],
  ] as const
  for (const [label, probeId] of fallbackFields) {
    if (usesFallbackProbe(probeId)) reasons.push(`${label} fallback probe used`)
  }
  return { state: reasons.length > 0 ? 'degraded' : 'passed', reasons }
}
