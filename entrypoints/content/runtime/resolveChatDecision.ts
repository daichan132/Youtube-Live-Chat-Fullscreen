import type { PageEvidence, PageTargets } from '../platform/youtube/types'
import type { ChatSource } from './types'

export const getManagedLiveChatUrl = (videoId: string) => {
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', videoId)
  return url.toString()
}

export type ChatDecision =
  | {
      kind: 'inactive'
      reason: 'not-watch-page' | 'not-fullscreen'
    }
  | {
      kind: 'pending'
      videoId: string | null
      mode: 'live' | 'archive' | null
      canToggle: boolean
    }
  | {
      kind: 'available'
      videoId: string
      mode: 'live' | 'archive'
      source: ChatSource
    }
  | {
      kind: 'unavailable'
      videoId: string
    }

export const resolveChatDecision = (evidence: PageEvidence, targets: PageTargets): ChatDecision => {
  if (evidence.route === 'other') return { kind: 'inactive', reason: 'not-watch-page' }
  if (!evidence.fullscreen) return { kind: 'inactive', reason: 'not-fullscreen' }
  if (!evidence.videoId) return { kind: 'pending', videoId: null, mode: null, canToggle: false }
  if (evidence.chatAvailability === 'unavailable') return { kind: 'unavailable', videoId: evidence.videoId }

  if (evidence.sourceKind === 'native-replay') {
    if (!targets.chatIframe || evidence.chatAvailability !== 'ready') {
      return {
        kind: 'pending',
        videoId: evidence.videoId,
        mode: 'archive',
        canToggle: targets.chatIframe !== null || evidence.capabilities.canOpenArchiveChat,
      }
    }
    return {
      kind: 'available',
      videoId: evidence.videoId,
      mode: 'archive',
      source: { kind: 'archive_borrow', iframe: targets.chatIframe },
    }
  }

  if ((evidence.sourceKind === 'native-live' || evidence.sourceKind === 'managed-live') && targets.chatIframe) {
    if (evidence.sourceKind === 'managed-live') {
      return {
        kind: 'available',
        videoId: evidence.videoId,
        mode: 'live',
        source: {
          kind: 'live_direct',
          videoId: evidence.videoId,
          url: getManagedLiveChatUrl(evidence.videoId),
        },
      }
    }
    return {
      kind: 'available',
      videoId: evidence.videoId,
      mode: 'live',
      source: {
        kind: 'live_borrow',
        videoId: evidence.videoId,
        iframe: targets.chatIframe,
      },
    }
  }

  if (evidence.videoMode === 'live' && evidence.capabilities.canCreateManagedLiveChat) {
    return {
      kind: 'available',
      videoId: evidence.videoId,
      mode: 'live',
      source: {
        kind: 'live_direct',
        videoId: evidence.videoId,
        url: getManagedLiveChatUrl(evidence.videoId),
      },
    }
  }

  if (evidence.capabilities.canOpenArchiveChat) {
    return {
      kind: 'pending',
      videoId: evidence.videoId,
      mode: 'archive',
      canToggle: true,
    }
  }

  if (evidence.videoMode === 'archive' && evidence.chatAvailability === 'pending') {
    return {
      kind: 'pending',
      videoId: evidence.videoId,
      mode: 'archive',
      canToggle: false,
    }
  }

  if (evidence.videoMode === 'unknown') {
    return {
      kind: 'pending',
      videoId: evidence.videoId,
      mode: null,
      canToggle: false,
    }
  }

  return { kind: 'unavailable', videoId: evidence.videoId }
}
