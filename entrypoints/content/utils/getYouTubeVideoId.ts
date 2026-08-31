import { getYouTubeMoviePlayer, getYouTubePlayerVideoId, readYouTubePlayerVideoData } from '../platform/youtube/playerVideoData'
import { getYouTubeContentSurface } from '../platform/youtube/youtubeSurface'

export const getVideoIdFromUrl = () => getYouTubeContentSurface(window.location.href)?.videoId ?? null

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

  const moviePlayer = getYouTubeMoviePlayer()
  addCandidate(candidates, getYouTubePlayerVideoId(moviePlayer, readYouTubePlayerVideoData(moviePlayer)))

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
  const surface = getYouTubeContentSurface(window.location.href)
  return surface?.route === 'live' && surface.videoId === null
}

export const getCurrentYouTubeVideoId = () => {
  const urlVideoId = getVideoIdFromUrl()
  if (urlVideoId) return urlVideoId
  if (!isChannelLiveEntryUrl()) return null

  const candidates = collectChannelLiveVideoIdCandidates()
  return candidates.size === 1 ? (candidates.values().next().value ?? null) : null
}
