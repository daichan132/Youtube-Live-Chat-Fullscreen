import { getVideoIdFromUrl, getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatIframe } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { isYouTubeLiveVideo } from '@/entrypoints/content/utils/isYouTubeLiveVideo'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import { isIframeForCurrentVideo, isLiveChatIframe, isReplayChatIframe } from '../shared/iframeDom'
import type { ChatMode } from './types'

const getExtensionIframe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
}

const isManagedLiveExtensionIframe = (iframe: HTMLIFrameElement | null) =>
  iframe?.getAttribute('data-ylc-owned') === 'true' && iframe.getAttribute('data-ylc-source') === 'live_direct'

const isBorrowedArchiveExtensionIframe = (iframe: HTMLIFrameElement | null) =>
  Boolean(iframe && iframe.getAttribute('data-ylc-chat') === 'true' && iframe.getAttribute('data-ylc-owned') !== 'true')

export const detectChatMode = (): ChatMode => {
  // URL updates immediately on SPA navigation; DOM attributes may lag.
  const currentVideoId = getVideoIdFromUrl() ?? getYouTubeVideoId()

  const extensionIframe = getExtensionIframe()
  if (extensionIframe && isIframeForCurrentVideo(extensionIframe, currentVideoId)) {
    if (isReplayChatIframe(extensionIframe) || isBorrowedArchiveExtensionIframe(extensionIframe)) return 'archive'
    if (isLiveChatIframe(extensionIframe) || isManagedLiveExtensionIframe(extensionIframe)) return 'live'
  }

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe && isIframeForCurrentVideo(nativeIframe, currentVideoId)) {
    if (isReplayChatIframe(nativeIframe)) return 'archive'
    if (isLiveChatIframe(nativeIframe)) return 'live'
  }

  if (isYouTubeLiveNow()) return 'live'

  if (hasArchiveNativeOpenControl()) return 'archive'

  // Fallback for cases where YouTube has not rendered chat DOM yet.
  // NOTE: `isLiveContent` can stay true on archived streams, so it must not
  // override explicit archive open-control signals above.
  if (isYouTubeLiveVideo()) return 'live'

  return 'none'
}
