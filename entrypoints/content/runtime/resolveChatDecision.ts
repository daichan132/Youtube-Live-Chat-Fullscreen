import type { PageSnapshot } from './readPageSnapshot'
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

export const resolveChatDecision = (snapshot: PageSnapshot): ChatDecision => {
  if (!snapshot.isWatchPage) return { kind: 'inactive', reason: 'not-watch-page' }
  if (!snapshot.isFullscreen) return { kind: 'inactive', reason: 'not-fullscreen' }
  if (!snapshot.videoId) return { kind: 'pending', videoId: null, mode: null, canToggle: false }
  if (snapshot.chatUnavailable) return { kind: 'unavailable', videoId: snapshot.videoId }

  if (snapshot.iframeMode === 'archive') {
    if (!snapshot.chatIframe || !snapshot.chatDocumentReady) {
      return {
        kind: 'pending',
        videoId: snapshot.videoId,
        mode: 'archive',
        canToggle: snapshot.archiveOpenControlAvailable,
      }
    }
    return {
      kind: 'available',
      videoId: snapshot.videoId,
      mode: 'archive',
      source: { kind: 'archive_borrow', iframe: snapshot.chatIframe },
    }
  }

  if (snapshot.iframeMode === 'live' && snapshot.chatIframe) {
    if (snapshot.chatIframeManaged) {
      return {
        kind: 'available',
        videoId: snapshot.videoId,
        mode: 'live',
        source: {
          kind: 'live_direct',
          videoId: snapshot.videoId,
          url: getManagedLiveChatUrl(snapshot.videoId),
        },
      }
    }
    return {
      kind: 'available',
      videoId: snapshot.videoId,
      mode: 'live',
      source: {
        kind: 'live_borrow',
        videoId: snapshot.videoId,
        iframe: snapshot.chatIframe,
      },
    }
  }

  if (snapshot.playerIsLive === true) {
    return {
      kind: 'available',
      videoId: snapshot.videoId,
      mode: 'live',
      source: {
        kind: 'live_direct',
        videoId: snapshot.videoId,
        url: getManagedLiveChatUrl(snapshot.videoId),
      },
    }
  }

  if (snapshot.archiveOpenControlAvailable) {
    return {
      kind: 'pending',
      videoId: snapshot.videoId,
      mode: 'archive',
      canToggle: true,
    }
  }

  if (snapshot.playerIsLive === null) {
    return {
      kind: 'pending',
      videoId: snapshot.videoId,
      mode: null,
      canToggle: false,
    }
  }

  return { kind: 'unavailable', videoId: snapshot.videoId }
}
