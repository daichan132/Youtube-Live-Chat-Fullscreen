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

const hasLiveNowAttribute = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(watchFlexy?.hasAttribute('is-live-now') || watchGrid?.hasAttribute('is-live-now'))
}

const hasLiveChatPresentAttribute = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    watchFlexy?.hasAttribute('live-chat-present') ||
      watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
      watchGrid?.hasAttribute('live-chat-present') ||
      watchGrid?.hasAttribute('live-chat-present-and-expanded'),
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
  if (hasLiveChatPresentAttribute()) return true
  if (hasPlayerLiveUiSignal()) return true

  const moviePlayerLive = getLiveFromMoviePlayer()
  if (moviePlayerLive !== null) return moviePlayerLive

  const initialPlayerResponseLive = getLiveFromInitialPlayerResponse()
  if (initialPlayerResponseLive !== null) return initialPlayerResponseLive

  const inlinePlayerResponseLive = getLiveFromInlinePlayerResponseScript()
  if (inlinePlayerResponseLive !== null) return inlinePlayerResponseLive

  return false
}
