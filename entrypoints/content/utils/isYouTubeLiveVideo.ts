import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'

type YouTubeVideoData = {
  isLive?: boolean
  isLiveContent?: boolean
  video_id?: string
  videoId?: string
}

export const isYouTubeLiveVideo = () => {
  const moviePlayer = document.getElementById('movie_player') as (HTMLElement & { getVideoData?: () => YouTubeVideoData }) | null
  const videoData = moviePlayer?.getVideoData?.()
  const currentVideoId = getCurrentYouTubeVideoId()
  const playerVideoId = videoData?.video_id ?? videoData?.videoId ?? moviePlayer?.getAttribute('video-id')
  if (!currentVideoId) return false
  if (playerVideoId && playerVideoId !== currentVideoId) return false
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive
  if (typeof videoData?.isLiveContent === 'boolean') return videoData.isLiveContent
  return false
}
