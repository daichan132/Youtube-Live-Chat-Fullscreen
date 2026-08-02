export type PageEvidence = {
  generation: number
  videoId: string | null
  route: 'watch' | 'live' | 'other'
  fullscreen: boolean
  videoMode: 'live' | 'archive' | 'vod' | 'unknown'
  chatAvailability: 'ready' | 'pending' | 'unavailable'
  capabilities: {
    canBorrowNativeChat: boolean
    canCreateManagedLiveChat: boolean
    canOpenArchiveChat: boolean
    canRestoreNativeChat: boolean
    canMountOverlay: boolean
    canMountPlayerSwitch: boolean
  }
  sourceKind: 'native-live' | 'native-replay' | 'managed-live' | null
  probeIds: readonly string[]
}

export type PageTargets = {
  player: HTMLElement | null
  fullscreenRoot: Element | null
  rightControls: HTMLElement | null
  nativeChatHost: HTMLElement | null
  nativeChatIframe: HTMLIFrameElement | null
  chatIframe: HTMLIFrameElement | null
  archiveOpenControl: HTMLElement | null
}

export type PageObservation = {
  evidence: PageEvidence
  targets: PageTargets
}

export const withObservationGeneration = (observation: PageObservation, generation: number): PageObservation => ({
  evidence: { ...observation.evidence, generation },
  targets: observation.targets,
})
