import {
  getYouTubeMoviePlayer,
  getYouTubePlayerVideoId,
  readYouTubePlayerVideoData,
} from '../platform/youtube/playerVideoData'
import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'

export const isYouTubeLiveVideo = () => {
  const moviePlayer = getYouTubeMoviePlayer()
  const videoData = readYouTubePlayerVideoData(moviePlayer)
  const currentVideoId = getCurrentYouTubeVideoId()
  const playerVideoId = getYouTubePlayerVideoId(moviePlayer, videoData)
  if (!currentVideoId) return false
  if (playerVideoId && playerVideoId !== currentVideoId) return false
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive
  if (typeof videoData?.isLiveContent === 'boolean') return videoData.isLiveContent
  return false
}
