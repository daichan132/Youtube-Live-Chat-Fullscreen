import { useEffect, useState } from 'react'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'

const VIDEO_ID_CHECK_INTERVAL_MS = 1000

export const useCurrentVideoId = () => {
  const [videoId, setVideoId] = useState(() => getCurrentYouTubeVideoId())

  useEffect(() => {
    const syncVideoId = () => {
      setVideoId(getCurrentYouTubeVideoId())
    }

    syncVideoId()
    const interval = window.setInterval(syncVideoId, VIDEO_ID_CHECK_INTERVAL_MS)
    document.addEventListener('yt-navigate-finish', syncVideoId)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('yt-navigate-finish', syncVideoId)
    }
  }, [])

  return videoId
}
