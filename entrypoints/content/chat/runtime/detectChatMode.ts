import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'
import { isYouTubeLiveVideo } from '@/entrypoints/content/utils/isYouTubeLiveVideo'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import {
  getCurrentLiveChatIframe,
  isIframeForCurrentVideo,
  isLiveChatIframe,
  isManagedLiveIframe,
  isReplayChatIframe,
  YLC_CHAT_ATTR,
} from '../shared/iframeDom'
import type { ChatMode } from './types'

type MoviePlayerElement = HTMLElement & {
  getVideoData?: () => { isLive?: boolean; video_id?: string; videoId?: string }
}

const getMoviePlayerLiveState = (currentVideoId: string | null) => {
  const player = document.getElementById('movie_player') as MoviePlayerElement | null
  const data = player?.getVideoData?.()
  const playerVideoId = data?.video_id ?? data?.videoId ?? player?.getAttribute('video-id')
  if (currentVideoId && playerVideoId && playerVideoId !== currentVideoId) {
    return { isLive: null, isStale: true }
  }
  return { isLive: typeof data?.isLive === 'boolean' ? data.isLive : null, isStale: false }
}

const getExtensionIframe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return root?.querySelector(`iframe[${YLC_CHAT_ATTR}="true"]`) as HTMLIFrameElement | null
}

export const detectChatMode = (): ChatMode => {
  // URL updates immediately on SPA navigation; DOM attributes may lag.
  const currentVideoId = getCurrentYouTubeVideoId()

  const extensionIframe = getExtensionIframe()
  if (extensionIframe && isIframeForCurrentVideo(extensionIframe, currentVideoId)) {
    if (isReplayChatIframe(extensionIframe)) return 'archive'
    if (isLiveChatIframe(extensionIframe) || isManagedLiveIframe(extensionIframe)) return 'live'
  }

  const nativeIframe = getCurrentLiveChatIframe(currentVideoId)
  if (nativeIframe) {
    if (isReplayChatIframe(nativeIframe)) return 'archive'
    if (isLiveChatIframe(nativeIframe)) return 'live'
  }

  if (isYouTubeLiveNow()) return 'live'

  if (hasArchiveNativeOpenControl()) {
    // hasArchiveNativeOpenControl() はライブ・アーカイブ両方で true を返す。
    // メタデータで確認し、ライブページでの誤検出を防ぐ。
    const { isLive, isStale } = getMoviePlayerLiveState(currentVideoId)
    if (isStale) return 'none'
    if (isLive === true) return 'live'
    // isLive === false または null（メタデータ未ロード）→ アーカイブとして扱う。
    // null 時に fall through すると isYouTubeLiveVideo() も null を返し
    // 'none' になってチャットが表示されない問題が発生する。
    return 'archive'
  }

  // Fallback for cases where YouTube has not rendered chat DOM yet.
  // NOTE: `isLiveContent` can stay true on archived streams, so it must not
  // override explicit archive open-control signals above.
  if (isYouTubeLiveVideo()) return 'live'

  return 'none'
}
