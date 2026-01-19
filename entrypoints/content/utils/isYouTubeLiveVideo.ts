type YouTubeVideoData = {
  isLive?: boolean
  isLiveContent?: boolean
}

export const isYouTubeLiveVideo = () => {
  const moviePlayer = document.getElementById('movie_player') as { getVideoData?: () => YouTubeVideoData } | null
  const videoData = moviePlayer?.getVideoData?.()
  if (typeof videoData?.isLive === 'boolean') return videoData.isLive
  if (typeof videoData?.isLiveContent === 'boolean') return videoData.isLiveContent
  return false
}
