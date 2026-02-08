type YouTubeVideoData = {
  isLive?: boolean
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
  }
}

let cachedScriptLiveNowHref = ''
let cachedScriptLiveNowValue: boolean | null = null

const hasReplayLabel = (value: string | null | undefined) => {
  const normalized = (value ?? '').toLowerCase()
  if (!normalized) return false
  return normalized.includes('replay') || normalized.includes('リプレイ')
}

const hasLiveNowAttribute = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now'))
}

const hasArchiveReplaySignal = () => {
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (chatFrame) {
    try {
      const docHref = chatFrame.contentDocument?.location?.href ?? ''
      if (docHref.includes('/live_chat_replay')) return true
    } catch {
      // Ignore and fallback to src attributes.
    }

    const src = chatFrame.getAttribute('src') ?? chatFrame.src ?? ''
    if (src.includes('/live_chat_replay')) return true
  }

  const replayButton = document.querySelector(
    '#show-hide-button button, ytd-live-chat-frame #show-hide-button button, #chat-container #show-hide-button button',
  ) as HTMLElement | null
  if (!replayButton) return false

  return (
    hasReplayLabel(replayButton.getAttribute('aria-label')) ||
    hasReplayLabel(replayButton.getAttribute('title')) ||
    hasReplayLabel(replayButton.getAttribute('data-title-no-tooltip')) ||
    hasReplayLabel(replayButton.getAttribute('data-tooltip-text'))
  )
}

const hasPlayerLiveUiSignal = () => {
  const liveTimeDisplay = document.querySelector('.ytp-time-display.ytp-live')
  if (liveTimeDisplay) return true

  const liveHeadBadge = document.querySelector('.ytp-live-badge.ytp-live-badge-is-livehead')
  return Boolean(liveHeadBadge)
}

const getLiveFromMoviePlayer = () => {
  const moviePlayer = document.getElementById('movie_player') as YouTubeMoviePlayer | null
  const videoData = moviePlayer?.getVideoData?.()
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive
  return null
}

const getLiveFromInitialPlayerResponse = () => {
  const response = (window as Window & { ytInitialPlayerResponse?: YouTubeInitialPlayerResponse }).ytInitialPlayerResponse
  const liveNow = response?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow
  if (typeof liveNow === 'boolean') return liveNow

  const isLive = response?.videoDetails?.isLive
  if (typeof isLive === 'boolean') return isLive

  return null
}

const parseLiveNowFromScript = (scriptText: string) => {
  const isLiveNowMatch = scriptText.match(/"isLiveNow":(true|false)/)
  if (isLiveNowMatch?.[1]) return isLiveNowMatch[1] === 'true'

  const viewedLiveMatch = scriptText.match(/"key":"is_viewed_live","value":"(True|False)"/)
  if (viewedLiveMatch?.[1]) return viewedLiveMatch[1] === 'True'

  return null
}

const getLiveFromInlinePlayerResponseScript = () => {
  const href = window.location.href
  if (cachedScriptLiveNowHref === href) return cachedScriptLiveNowValue

  const scripts = document.querySelectorAll('script')
  for (const script of scripts) {
    const text = script.textContent ?? ''
    if (!text.includes('ytInitialPlayerResponse')) continue
    const parsed = parseLiveNowFromScript(text)
    if (parsed !== null) {
      cachedScriptLiveNowHref = href
      cachedScriptLiveNowValue = parsed
      return parsed
    }
  }

  cachedScriptLiveNowHref = href
  cachedScriptLiveNowValue = null
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
