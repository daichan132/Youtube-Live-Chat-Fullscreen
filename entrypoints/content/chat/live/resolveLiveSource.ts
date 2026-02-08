import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
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

  const hasManagedLiveCurrent = isManagedLiveIframe(currentIframe)
  if (!hasManagedLiveCurrent && !isYouTubeLiveNow() && !hasLiveChatSignals()) return null

  return {
    kind: 'live_direct',
    videoId,
    url: getLiveChatUrlForVideo(videoId),
  }
}
