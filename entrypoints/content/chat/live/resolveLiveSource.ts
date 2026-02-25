import { isLiveChatIframe, isReplayChatIframe } from '@/entrypoints/content/chat/shared/iframeDom'
import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { getLiveChatIframe } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import type { LiveChatSource } from '../runtime/types'

const YLC_OWNED_ATTR = 'data-ylc-owned'
const YLC_SOURCE_ATTR = 'data-ylc-source'

const isManagedLiveIframe = (iframe: HTMLIFrameElement | null | undefined) =>
  iframe?.getAttribute(YLC_OWNED_ATTR) === 'true' && iframe.getAttribute(YLC_SOURCE_ATTR) === 'live_direct'

export const getLiveChatUrlForVideo = (videoId: string) => {
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', videoId)
  return url.toString()
}

export const resolveLiveSource = (videoId: string | null, currentIframe: HTMLIFrameElement | null = null): LiveChatSource | null => {
  if (!videoId) return null

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe && isReplayChatIframe(nativeIframe)) return null

  const hasManagedLiveCurrent = isManagedLiveIframe(currentIframe)

  const hasStrongLiveSignal = isYouTubeLiveNow() || isLiveChatIframe(nativeIframe)
  if (!hasStrongLiveSignal && !hasManagedLiveCurrent) return null

  // When a strong live signal already confirms the stream is live, skip the
  // hasLiveChatSignals() check. Closing the native chat panel can remove DOM
  // attributes (live-chat-present) that hasLiveChatSignals() depends on.
  if (!hasStrongLiveSignal && !hasLiveChatSignals() && !hasManagedLiveCurrent) return null

  return {
    kind: 'live_direct',
    videoId,
    url: getLiveChatUrlForVideo(videoId),
  }
}
