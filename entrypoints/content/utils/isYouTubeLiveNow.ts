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

type ScriptLiveNowResult = { live: boolean; videoId: string }
const scriptLiveNowCache = new WeakMap<HTMLScriptElement, { text: string; results: readonly ScriptLiveNowResult[] }>()

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
  if ((containerHost && isChatHostForCurrentVideo(containerHost)) || containerHosts.some(isChatHostForCurrentVideo)) return true

  const containerFrames = Array.from(chatContainer.querySelectorAll<HTMLIFrameElement>('#chatframe, iframe.ytd-live-chat-frame'))
  return containerFrames.some(isChatFrameForCurrentUrl)
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

  if (document.querySelector('.ytp-time-display.ytp-live')) return true
  return document.querySelector('.ytp-live-badge.ytp-live-badge-is-livehead') !== null
}

const getLiveFromMoviePlayer = () => {
  const { data, videoId } = readCurrentPlayerData()
  if (!isKnownVideoIdCurrent(videoId)) return null
  return typeof data?.isLive === 'boolean' ? data.isLive : null
}

const getPlayerResponseLive = (response: YouTubeInitialPlayerResponse, rawJson = ''): ScriptLiveNowResult | null => {
  const videoId = response.videoDetails?.videoId
  if (!videoId) return null

  const liveNow = response.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
  if (typeof liveNow === 'boolean') return { live: liveNow, videoId }

  const isLive = response.videoDetails?.isLive
  if (typeof isLive === 'boolean') return { live: isLive, videoId }

  const viewedLiveMatch = rawJson.match(/"key"\s*:\s*"is_viewed_live"\s*,\s*"value"\s*:\s*"(True|False)"/)
  return viewedLiveMatch?.[1] ? { live: viewedLiveMatch[1] === 'True', videoId } : null
}

const getLiveFromInitialPlayerResponse = () => {
  const response = (window as Window & { ytInitialPlayerResponse?: YouTubeInitialPlayerResponse }).ytInitialPlayerResponse
  if (!response) return null
  const result = getPlayerResponseLive(response)
  return result && isExplicitVideoIdCurrent(result.videoId) ? result.live : null
}

const findJsonObjectEnd = (text: string, start: number) => {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
      continue
    }
    if (character === '{') depth += 1
    else if (character === '}') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }

  return -1
}

const parseInlinePlayerResponses = (scriptText: string): ScriptLiveNowResult[] => {
  const results: ScriptLiveNowResult[] = []
  let searchFrom = 0

  while (searchFrom < scriptText.length) {
    const markerIndex = scriptText.indexOf('ytInitialPlayerResponse', searchFrom)
    if (markerIndex < 0) break
    const objectStart = scriptText.indexOf('{', markerIndex + 'ytInitialPlayerResponse'.length)
    if (objectStart < 0 || objectStart - markerIndex > 200) {
      searchFrom = markerIndex + 1
      continue
    }
    const objectEnd = findJsonObjectEnd(scriptText, objectStart)
    if (objectEnd < 0) break

    const rawJson = scriptText.slice(objectStart, objectEnd)
    try {
      const response = JSON.parse(rawJson) as YouTubeInitialPlayerResponse
      const result = getPlayerResponseLive(response, rawJson)
      if (result) results.push(result)
    } catch {
      // Ignore malformed or non-JSON assignments and continue with stronger page signals.
    }
    searchFrom = objectEnd
  }

  return results
}

const readScriptLiveNow = (script: HTMLScriptElement) => {
  const text = script.textContent ?? ''
  const cached = scriptLiveNowCache.get(script)
  if (cached?.text === text) return cached.results

  const results = text.includes('ytInitialPlayerResponse') ? parseInlinePlayerResponses(text) : []
  scriptLiveNowCache.set(script, { text, results })
  return results
}

const getLiveFromInlinePlayerResponseScript = () => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return null

  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script')).reverse()
  for (const script of scripts) {
    const results = readScriptLiveNow(script)
    for (let index = results.length - 1; index >= 0; index -= 1) {
      const result = results[index]
      if (result?.videoId === currentVideoId) return result.live
    }
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

  return hasPlayerLiveUiSignal()
}
