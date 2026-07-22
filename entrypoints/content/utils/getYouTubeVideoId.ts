export const getVideoIdFromUrl = () => {
  try {
    const url = new URL(window.location.href)
    const queryId = url.searchParams.get('v')
    if (queryId) return queryId
    const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]+)/)
    if (liveMatch?.[1]) return liveMatch[1]
    return null
  } catch {
    return null
  }
}

const CHANNEL_LIVE_PATH_PATTERN = /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/live\/?$/

const getVideoIdFromHref = (href: string | null | undefined) => {
  if (!href) return null
  try {
    return new URL(href, window.location.origin).searchParams.get('v')
  } catch {
    return null
  }
}

const addCandidate = (candidates: Set<string>, videoId: string | null | undefined) => {
  if (videoId) candidates.add(videoId)
}

const collectChannelLiveVideoIdCandidates = () => {
  const candidates = new Set<string>()

  const moviePlayer = document.getElementById('movie_player') as
    | (HTMLElement & { getVideoData?: () => { video_id?: string; videoId?: string } })
    | null
  try {
    const videoData = moviePlayer?.getVideoData?.()
    addCandidate(candidates, videoData?.video_id ?? videoData?.videoId)
  } catch {
    // Ignore a temporarily unavailable player API and use other page signals.
  }

  for (const watchElement of Array.from(document.querySelectorAll('ytd-watch-flexy[video-id], ytd-watch-grid[video-id]'))) {
    addCandidate(candidates, watchElement.getAttribute('video-id'))
  }

  const nativeIframes = document.querySelectorAll<HTMLIFrameElement>(
    '#chatframe:not([data-ylc-chat="true"]), ytd-live-chat-frame iframe.ytd-live-chat-frame:not([data-ylc-chat="true"])',
  )
  for (const iframe of Array.from(nativeIframes)) {
    try {
      addCandidate(candidates, getVideoIdFromHref(iframe.contentDocument?.location?.href))
    } catch {
      // Cross-origin access can fail; src remains available as a fallback.
    }
    addCandidate(candidates, getVideoIdFromHref(iframe.getAttribute('src') ?? iframe.src))
  }

  return candidates
}

const isChannelLiveEntryUrl = () => {
  try {
    return CHANNEL_LIVE_PATH_PATTERN.test(new URL(window.location.href).pathname)
  } catch {
    return false
  }
}

export const getCurrentYouTubeVideoId = () => {
  const urlVideoId = getVideoIdFromUrl()
  if (urlVideoId) return urlVideoId
  if (!isChannelLiveEntryUrl()) return null

  const candidates = collectChannelLiveVideoIdCandidates()
  return candidates.size === 1 ? (candidates.values().next().value ?? null) : null
}
