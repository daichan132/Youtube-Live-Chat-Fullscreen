import {
  getIframeDocumentHref,
  getIframeVideoId,
  isLiveChatIframe,
  isManagedLiveIframe,
  isReplayChatIframe,
  markChatIframeObservedForCurrentVideo,
} from '@/entrypoints/content/chat/shared/iframeDom'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, hasLiveChatRendererReady, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'

type MoviePlayerElement = HTMLElement & {
  getVideoData?: () => {
    isLive?: boolean
    isLiveContent?: boolean
    video_id?: string
    videoId?: string
  }
}

export type PageSnapshot = {
  videoId: string | null
  isWatchPage: boolean
  isFullscreen: boolean

  player: HTMLElement | null
  rightControls: HTMLElement | null

  chatHost: HTMLElement | null
  chatIframe: HTMLIFrameElement | null
  nativeChatIframe: HTMLIFrameElement | null
  chatIframeManaged: boolean

  playerIsLive: boolean | null
  archiveOpenControlAvailable: boolean
  chatUnavailable: boolean
  chatDocumentReady: boolean
  iframeMode: 'live' | 'archive' | null
}

const isWatchLocation = (videoId: string | null) => {
  if (!videoId) return false
  try {
    const pathname = new URL(window.location.href).pathname
    return pathname === '/watch' || pathname.startsWith('/live/') || pathname.endsWith('/live')
  } catch {
    return false
  }
}

const getPlayerLiveState = (player: MoviePlayerElement | null, videoId: string | null) => {
  const data = player?.getVideoData?.()
  const playerVideoId = data?.video_id ?? data?.videoId ?? player?.getAttribute('video-id')
  if (videoId && playerVideoId && playerVideoId !== videoId) return null
  if (data?.isLive === true) return true
  if (data?.isLive === false) {
    // Archived live streams report isLive=false while isLiveContent remains
    // true. Keep that state pending until replay DOM or an unavailable
    // renderer appears instead of classifying it as an ordinary video.
    return data.isLiveContent === true ? null : false
  }
  if (data?.isLiveContent === false) return false

  const watch = document.querySelector('ytd-watch-flexy, ytd-watch-grid')
  const watchVideoId = watch?.getAttribute('video-id')
  if (videoId && watchVideoId && watchVideoId !== videoId) return null
  if (watch?.hasAttribute('is-live-now')) return true
  if (document.querySelector('.ytp-time-display.ytp-live, .ytp-live-badge.ytp-live-badge-is-livehead')) return true
  return null
}

const iframeMatchesVideo = (iframe: HTMLIFrameElement, videoId: string | null) => {
  if (!videoId) return false
  const iframeVideoId = getIframeVideoId(iframe)
  return iframeVideoId === videoId
}

const collectNativeChatIframes = () => {
  const result = new Set<HTMLIFrameElement>()
  for (const iframe of document.querySelectorAll<HTMLIFrameElement>('#chatframe, ytd-live-chat-frame iframe.ytd-live-chat-frame')) {
    result.add(iframe)
  }
  return [...result]
}

export const readPageSnapshot = (leasedIframe: HTMLIFrameElement | null = null): PageSnapshot => {
  const videoId = getCurrentYouTubeVideoId()
  const player = document.getElementById('movie_player') as MoviePlayerElement | null
  const rightControls = (player?.querySelector('.ytp-right-controls') as HTMLElement | null) ?? null
  const chatHosts = [...document.querySelectorAll<HTMLElement>('ytd-live-chat-frame')]
  const nativeIframes = collectNativeChatIframes()

  for (const iframe of nativeIframes) {
    if (!getIframeVideoId(iframe)) markChatIframeObservedForCurrentVideo(iframe, videoId)
  }

  const nativeChatIframe = nativeIframes.find(iframe => iframeMatchesVideo(iframe, videoId)) ?? null
  const currentLeaseMatches = leasedIframe !== null && iframeMatchesVideo(leasedIframe, videoId) && leasedIframe.isConnected
  const chatIframe = nativeChatIframe ?? (currentLeaseMatches ? leasedIframe : null)
  const chatHost =
    (nativeChatIframe?.closest('ytd-live-chat-frame') as HTMLElement | null) ??
    chatHosts.find(host => host.getAttribute('video-id') === videoId) ??
    null
  const chatDocument = chatIframe ? getLiveChatDocument(chatIframe) : null
  const chatUnavailable = Boolean(chatDocument && isLiveChatUnavailable(chatDocument))
  const iframeMode = chatIframe
    ? isReplayChatIframe(chatIframe)
      ? 'archive'
      : isLiveChatIframe(chatIframe) || isManagedLiveIframe(chatIframe)
        ? 'live'
        : null
    : null

  return {
    videoId,
    isWatchPage: isWatchLocation(videoId),
    isFullscreen: document.fullscreenElement !== null,
    player,
    rightControls,
    chatHost,
    chatIframe,
    nativeChatIframe,
    chatIframeManaged: isManagedLiveIframe(chatIframe),
    playerIsLive: getPlayerLiveState(player, videoId),
    archiveOpenControlAvailable: hasArchiveNativeOpenControl(),
    chatUnavailable,
    chatDocumentReady: Boolean(chatDocument && hasLiveChatRendererReady(chatDocument)),
    iframeMode,
  }
}

export const getSnapshotIframeHref = (snapshot: PageSnapshot) =>
  snapshot.chatIframe ? getIframeDocumentHref(snapshot.chatIframe) || snapshot.chatIframe.getAttribute('src') || '' : ''
