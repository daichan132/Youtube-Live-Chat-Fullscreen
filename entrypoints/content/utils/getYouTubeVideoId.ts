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

export const getCurrentYouTubeVideoId = () => getVideoIdFromUrl()
