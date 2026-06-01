import { getCurrentLiveChatIframe, isChatHostForCurrentVideo, isIframeForCurrentVideo } from '../chat/shared/iframeDom'
import { getVideoIdFromUrl } from './getYouTubeVideoId'

type YouTubeVideoData = {
  isLive?: boolean
  video_id?: string
  videoId?: string
}

type YouTubeMoviePlayer = HTMLElement & {
  getVideoData?: () => YouTubeVideoData
}

type YouTubeInitialPlayerResponse = {
  microformat?: {
    playerMicroformatRenderer?: {
      liveBroadcastDetails?: {
        isLiveNow?: boolean
      }
    }
  }
  videoDetails?: {
    isLive?: boolean
    videoId?: string
  }
}

let cachedScriptLiveNowHref = ''
let cachedScriptLiveNowResult: { live: boolean; videoId: string | null } | null = null

const hasReplayLabel = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase()
  if (!normalized) return false
  return normalized.includes('replay') || normalized.includes('リプレイ')
}

const isExplicitVideoIdCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getVideoIdFromUrl()
  if (!currentVideoId) return true
  return videoId === currentVideoId
}

const isKnownVideoIdCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getVideoIdFromUrl()
  if (!currentVideoId || !videoId) return true
  return videoId === currentVideoId
}

const hasCurrentVideoMarker = (...videoIds: Array<string | null | undefined>) => {
  const currentVideoId = getVideoIdFromUrl()
  if (!currentVideoId) return true
  return videoIds.some(videoId => videoId === currentVideoId)
}

const hasLiveNowAttribute = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    (watchFlexy?.hasAttribute('is-live-now') && isExplicitVideoIdCurrent(watchFlexy.getAttribute('video-id'))) ||
      (watchGrid?.hasAttribute('is-live-now') && isExplicitVideoIdCurrent(watchGrid.getAttribute('video-id'))),
  )
}

const isChatFrameForCurrentUrl = (iframe: HTMLIFrameElement): boolean => isIframeForCurrentVideo(iframe, getVideoIdFromUrl())

const isReplayButtonForCurrentChat = (button: HTMLElement) => {
  const host = button.closest('ytd-live-chat-frame') as HTMLElement | null
  if (host) return isChatHostForCurrentVideo(host)

  const chatContainer = button.closest('#chat-container')
  if (!chatContainer) return false

  const containerHost = chatContainer.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const containerHosts = Array.from(chatContainer.querySelectorAll<HTMLElement>('ytd-live-chat-frame'))
  if ((containerHost && isChatHostForCurrentVideo(containerHost)) || containerHosts.some(host => isChatHostForCurrentVideo(host))) {
    return true
  }

  const containerFrames = Array.from(chatContainer.querySelectorAll<HTMLIFrameElement>('#chatframe, iframe.ytd-live-chat-frame'))
  return containerFrames.some(iframe => isChatFrameForCurrentUrl(iframe))
}

const hasReplayButtonLabel = (button: HTMLElement) =>
  hasReplayLabel(button.getAttribute('aria-label')) ||
  hasReplayLabel(button.getAttribute('title')) ||
  hasReplayLabel(button.getAttribute('data-title-no-tooltip')) ||
  hasReplayLabel(button.getAttribute('data-tooltip-text'))

const hasArchiveReplaySignal = () => {
  const chatFrame = getCurrentLiveChatIframe(getVideoIdFromUrl())
  if (chatFrame && isChatFrameForCurrentUrl(chatFrame)) {
    try {
      const docHref = chatFrame.contentDocument?.location?.href ?? ''
      if (docHref.includes('/live_chat_replay')) return true
    } catch {
      // Ignore and fallback to src attributes.
    }

    const src = chatFrame.getAttribute('src') ?? chatFrame.src ?? ''
    if (src.includes('/live_chat_replay')) return true
  }

  const replayButtons = document.querySelectorAll<HTMLElement>(
    '#show-hide-button button, ytd-live-chat-frame #show-hide-button button, #chat-container #show-hide-button button',
  )
  return Array.from(replayButtons).some(button => isReplayButtonForCurrentChat(button) && hasReplayButtonLabel(button))
}

const hasPlayerLiveUiSignal = () => {
  const moviePlayer = document.getElementById('movie_player') as YouTubeMoviePlayer | null
  const videoData = moviePlayer?.getVideoData?.()
  const moviePlayerVideoId = videoData?.video_id ?? videoData?.videoId ?? moviePlayer?.getAttribute('video-id')
  if (!isKnownVideoIdCurrent(moviePlayerVideoId)) return false

  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  const watchVideoId = watchFlexy?.getAttribute('video-id') ?? watchGrid?.getAttribute('video-id')
  if (!isKnownVideoIdCurrent(watchVideoId)) return false
  if (!hasCurrentVideoMarker(moviePlayerVideoId, watchVideoId)) return false

  const liveTimeDisplay = document.querySelector('.ytp-time-display.ytp-live')
  if (liveTimeDisplay) return true

  const liveHeadBadge = document.querySelector('.ytp-live-badge.ytp-live-badge-is-livehead')
  return Boolean(liveHeadBadge)
}

const getLiveFromMoviePlayer = () => {
  const moviePlayer = document.getElementById('movie_player') as YouTubeMoviePlayer | null
  const videoData = moviePlayer?.getVideoData?.()
  const videoId = videoData?.video_id ?? videoData?.videoId ?? moviePlayer?.getAttribute('video-id')
  if (!isKnownVideoIdCurrent(videoId)) return null
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive
  return null
}

const getLiveFromInitialPlayerResponse = () => {
  const response = (window as Window & { ytInitialPlayerResponse?: YouTubeInitialPlayerResponse }).ytInitialPlayerResponse
  if (!isExplicitVideoIdCurrent(response?.videoDetails?.videoId)) return null

  const liveNow = response?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
  if (typeof liveNow === 'boolean') return liveNow

  const isLive = response?.videoDetails?.isLive
  if (typeof isLive === 'boolean') return isLive

  return null
}

const parseVideoIdFromScript = (scriptText: string) => {
  const videoIdMatch =
    scriptText.match(/"videoId":"([^"]+)"/) ??
    scriptText.match(/"video_id":"([^"]+)"/) ??
    scriptText.match(/"videoDetails":\{[^}]*"videoId":"([^"]+)"/)
  return videoIdMatch?.[1] ?? null
}

const parseLiveNowFromScript = (scriptText: string) => {
  const isLiveNowMatch = scriptText.match(/"isLiveNow":(true|false)/)
  if (isLiveNowMatch?.[1]) {
    return {
      live: isLiveNowMatch[1] === 'true',
      videoId: parseVideoIdFromScript(scriptText),
    }
  }

  const viewedLiveMatch = scriptText.match(/"key":"is_viewed_live","value":"(True|False)"/)
  if (viewedLiveMatch?.[1]) {
    return {
      live: viewedLiveMatch[1] === 'True',
      videoId: parseVideoIdFromScript(scriptText),
    }
  }

  return null
}

const getLiveFromInlinePlayerResponseScript = () => {
  const href = window.location.href
  if (cachedScriptLiveNowHref === href) return cachedScriptLiveNowResult?.live ?? null

  const scripts = document.querySelectorAll('script')
  for (const script of scripts) {
    const text = script.textContent ?? ''
    if (!text.includes('ytInitialPlayerResponse')) continue
    const parsed = parseLiveNowFromScript(text)
    if (parsed !== null && isExplicitVideoIdCurrent(parsed.videoId)) {
      cachedScriptLiveNowHref = href
      cachedScriptLiveNowResult = parsed
      return parsed.live
    }
  }

  cachedScriptLiveNowHref = href
  cachedScriptLiveNowResult = null
  return null
}

export const isYouTubeLiveNow = () => {
  if (hasLiveNowAttribute()) return true
  if (hasArchiveReplaySignal()) return false

  const moviePlayerLive = getLiveFromMoviePlayer()
  if (moviePlayerLive !== null) return moviePlayerLive

  const initialPlayerResponseLive = getLiveFromInitialPlayerResponse()
  if (initialPlayerResponseLive !== null) return initialPlayerResponseLive

  const inlinePlayerResponseLive = getLiveFromInlinePlayerResponseScript()
  if (inlinePlayerResponseLive !== null) return inlinePlayerResponseLive

  if (hasPlayerLiveUiSignal()) return true

  return false
}
