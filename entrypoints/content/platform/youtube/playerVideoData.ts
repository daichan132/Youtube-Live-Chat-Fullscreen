import { playerProbe, queryFirstProbe } from './selectorCatalog'

export type YouTubeVideoData = {
  isLive?: boolean
  isLiveContent?: boolean
  video_id?: string
  videoId?: string
}

export type YouTubeMoviePlayer = HTMLElement & {
  getVideoData?: () => YouTubeVideoData
}

export const getYouTubeMoviePlayer = () => queryFirstProbe<YouTubeMoviePlayer>(document, playerProbe).element

export const readYouTubePlayerVideoData = (player: YouTubeMoviePlayer | null): YouTubeVideoData | null => {
  try {
    return player?.getVideoData?.() ?? null
  } catch {
    return null
  }
}

export const getYouTubePlayerVideoId = (player: YouTubeMoviePlayer | null, data: YouTubeVideoData | null) =>
  data?.video_id ?? data?.videoId ?? player?.getAttribute('video-id') ?? null
