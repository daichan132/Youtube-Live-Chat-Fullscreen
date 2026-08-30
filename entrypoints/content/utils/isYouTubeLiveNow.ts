import { getCurrentLiveChatIframe, isChatHostForCurrentVideo, isIframeForCurrentVideo } from '../chat/shared/iframeDom'
import {
  getYouTubeMoviePlayer,
  getYouTubePlayerVideoId,
  readYouTubePlayerVideoData,
  type YouTubeVideoData,
} from '../platform/youtube/playerVideoData'
import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'

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

type ScriptLiveNowResult = { live: boolean; videoId: string | null }
const scriptLiveNowCache = new WeakMap<HTMLScriptElement, { text: string; result: ScriptLiveNowResult | null }>()

const hasReplayLabel = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase()
  if (!normalized) return false
  return normalized.includes('replay') || normalized.includes('リプレイ')
}

const isExplicitVideoIdCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return false
  return videoId === currentVideoId
}

const isKnownVideoIdCurrent = (videoId: string | null | undefined) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return false
  if (!videoId) return true
  return videoId === currentVideoId
}

const hasCurrentVideoMarker = (...videoIds: Array<string | null | undefined>) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return false
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

const isChatFrameForCurrentUrl = (iframe: HTMLIFrameElement): boolean => isIframeForCurrentVideo(iframe, getCurrentYouTubeVideoId())

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
  const chatFrame = getCurrentLiveChatIframe(getCurrentYouTubeVideoId())
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

const readCurrentPlayerData = (): { data: YouTubeVideoData | null; videoId: string | null } => {
  const moviePlayer = getYouTubeMoviePlayer()
  const data = readYouTubePlayerVideoData(moviePlayer)
  return { data, videoId: getYouTubePlayerVideoId(moviePlayer, data) }
}

const hasPlayerLiveUiSignal = () => {
  const { videoId: moviePlayerVideoId } = readCurrentPlayerData()
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
  const { data, videoId } = readCurrentPlayerData()
  if (!isKnownVideoIdCurrent(videoId)) return null
  if (typeof data?.isLive === 'boolean') return data.isLive
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
  const videoDetailsStart = scriptText.indexOf('"videoDetails"')
  if (videoDetailsStart >= 0) {
    const videoDetailsSection = scriptText.slice(videoDetailsStart, videoDetailsStart + 5000)
    const videoDetailsMatch = videoDetailsSection.match(/"videoId"\s*:\s*"([^"]+)"/)
    if (videoDetailsMatch?.[1]) return videoDetailsMatch[1]
  }

  const fallbackMatch = scriptText.match(/"video_id"\s*:\s*"([^"]+)"/) ?? scriptText.match(/"videoId"\s*:\s*"([^"]+)"/)
  return fallbackMatch?.[1] ?? null
}

const parseLiveNowFromScript = (scriptText: string): ScriptLiveNowResult | null => {
  const isLiveNowMatch = scriptText.match(/"isLiveNow"\s*:\s*(true|false)/)
  if (isLiveNowMatch?.[1]) {
    return {
      live: isLiveNowMatch[1] === 'true',
      videoId: parseVideoIdFromScript(scriptText),
    }
  }

  const viewedLiveMatch = scriptText.match(/"key"\s*:\s*"is_viewed_live"\s*,\s*"value"\s*:\s*"(True|False)"/)
  if (viewedLiveMatch?.[1]) {
    return {
      live: viewedLiveMatch[1] === 'True',
      videoId: parseVideoIdFromScript(scriptText),
    }
  }

  return null
}

const readScriptLiveNow = (script: HTMLScriptElement) => {
  const text = script.textContent ?? ''
  const cached = scriptLiveNowCache.get(script)
  if (cached?.text === text) return cached.result

  const result = text.includes('ytInitialPlayerResponse') ? parseLiveNowFromScript(text) : null
  scriptLiveNowCache.set(script, { text, result })
  return result
}

const getLiveFromInlinePlayerResponseScript = () => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return null

  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).reverse()
  for (const script of scripts) {
    const parsed = readScriptLiveNow(script)
    if (parsed !== null && parsed.videoId === currentVideoId) return parsed.live
  }

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
