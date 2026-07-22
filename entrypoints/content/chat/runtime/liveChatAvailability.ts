import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { getCurrentLiveChatIframe, isIframeForCurrentVideo, isLiveChatIframe } from '../shared/iframeDom'

const isUnavailableCurrentLiveIframe = (iframe: HTMLIFrameElement | null | undefined, currentVideoId: string) => {
  if (!iframe || !isIframeForCurrentVideo(iframe, currentVideoId) || !isLiveChatIframe(iframe)) return false
  const doc = getLiveChatDocument(iframe)
  return Boolean(doc && isLiveChatUnavailable(doc))
}

export const getUnavailableCurrentLiveChatVideoId = (candidateIframe?: HTMLIFrameElement | null) => {
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return null

  if (isUnavailableCurrentLiveIframe(candidateIframe, currentVideoId)) return currentVideoId

  const nativeIframe = getCurrentLiveChatIframe(currentVideoId)
  return isUnavailableCurrentLiveIframe(nativeIframe, currentVideoId) ? currentVideoId : null
}
