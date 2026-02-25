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

export const getYouTubeVideoId = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchFlexyId = watchFlexy?.getAttribute('video-id')
  if (watchFlexyId) return watchFlexyId

  const moviePlayer = document.getElementById('movie_player')
  const moviePlayerId = moviePlayer?.getAttribute('video-id')
  if (moviePlayerId) return moviePlayerId
  const playerData = (moviePlayer as { getVideoData?: () => { video_id?: string } } | null)?.getVideoData?.()
  if (playerData?.video_id) return playerData.video_id

  return getVideoIdFromUrl()
}
