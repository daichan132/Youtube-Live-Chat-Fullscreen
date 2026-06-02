import {
  getCurrentLiveChatIframe,
  isIframeForCurrentVideo,
  isLiveChatIframe,
  isManagedLiveIframe,
  isReplayChatIframe,
} from '@/entrypoints/content/chat/shared/iframeDom'
import { getLiveChatDocument, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import type { LiveChatSource } from '../runtime/types'

export const getLiveChatUrlForVideo = (videoId: string) => {
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', videoId)
  return url.toString()
}

export const resolveLiveSource = (videoId: string | null, currentIframe: HTMLIFrameElement | null = null): LiveChatSource | null => {
  if (!videoId) return null

  if (currentIframe && !isManagedLiveIframe(currentIframe) && isLiveChatIframe(currentIframe)) {
    return {
      kind: 'live_borrow',
      videoId,
      iframe: currentIframe,
    }
  }

  const nativeIframe = getCurrentLiveChatIframe(videoId)
  const nativeIframeMatchesCurrentVideo = nativeIframe !== null
  if (nativeIframe && nativeIframeMatchesCurrentVideo && isReplayChatIframe(nativeIframe)) return null
  const nativeDocument = nativeIframe && nativeIframeMatchesCurrentVideo ? getLiveChatDocument(nativeIframe) : null
  if (nativeDocument && isLiveChatUnavailable(nativeDocument)) return null

  const managedLiveCurrent = currentIframe && isManagedLiveIframe(currentIframe) && isIframeForCurrentVideo(currentIframe, videoId)
  const managedLiveDocument = managedLiveCurrent ? getLiveChatDocument(currentIframe) : null
  if (managedLiveDocument && isLiveChatUnavailable(managedLiveDocument)) return null

  const hasStrongLiveSignal = isYouTubeLiveNow() || (nativeIframeMatchesCurrentVideo && isLiveChatIframe(nativeIframe))
  if (!hasStrongLiveSignal && !managedLiveCurrent) return null

  if (nativeIframe && isLiveChatIframe(nativeIframe)) {
    return {
      kind: 'live_borrow',
      videoId,
      iframe: nativeIframe,
    }
  }

  return {
    kind: 'live_direct',
    videoId,
    url: getLiveChatUrlForVideo(videoId),
  }
}
