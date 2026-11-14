const YOUTUBE_ORIGINS = new Set(['https://www.youtube.com', 'https://youtube.com'])
const DIRECT_LIVE_PATH_PATTERN = /^\/live\/([a-zA-Z0-9_-]+)\/?$/
export const CHANNEL_LIVE_PATH_PATTERN = /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/live\/?$/
const LEGACY_CHANNEL_LIVE_PATH_PATTERN = /^\/([a-zA-Z0-9_-]+)\/live\/?$/
const RESERVED_CHANNEL_NAMES = new Set([
  'c',
  'channel',
  'clip',
  'embed',
  'feed',
  'gaming',
  'hashtag',
  'live',
  'live_chat',
  'live_chat_replay',
  'playlist',
  'results',
  'shorts',
  'user',
  'watch',
])

export type YouTubeContentSurface = {
  route: 'watch' | 'live'
  videoId: string | null
  activationKey: string
}

const nonEmpty = (value: string | null) => value?.trim() || null

export const getYouTubeContentSurface = (href: string): YouTubeContentSurface | null => {
  try {
    const url = new URL(href, 'https://www.youtube.com')
    if (!YOUTUBE_ORIGINS.has(url.origin)) return null

    if (url.pathname === '/watch') {
      const videoId = nonEmpty(url.searchParams.get('v'))
      return {
        route: 'watch',
        videoId,
        activationKey: `watch:${videoId ?? 'pending'}`,
      }
    }

    const directLiveMatch = url.pathname.match(DIRECT_LIVE_PATH_PATTERN)
    const directLiveVideoId = directLiveMatch?.[1] ?? null
    if (directLiveVideoId) {
      return {
        route: 'live',
        videoId: directLiveVideoId,
        activationKey: `live:${directLiveVideoId}`,
      }
    }

    // YouTube can redirect a handle entry to a legacy /<name>/live URL.
    const legacyChannel = url.pathname.match(LEGACY_CHANNEL_LIVE_PATH_PATTERN)?.[1]
    if (CHANNEL_LIVE_PATH_PATTERN.test(url.pathname) || (legacyChannel && !RESERVED_CHANNEL_NAMES.has(legacyChannel.toLowerCase()))) {
      return {
        route: 'live',
        videoId: null,
        activationKey: `channel-live:${url.pathname.replace(/\/$/, '')}`,
      }
    }

    return null
  } catch {
    return null
  }
}

export const isYouTubeContentSurface = (href: string) => getYouTubeContentSurface(href) !== null
