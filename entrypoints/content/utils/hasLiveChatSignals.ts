import { getYouTubeVideoId } from './getYouTubeVideoId'
import {
  getLiveChatDocument,
  getLiveChatIframe,
  getLiveChatVideoIdFromIframe,
  hasLiveChatRendererReady,
  hasWatchChatAttributes,
  isLiveChatUnavailable,
} from './hasPlayableLiveChat'

const hasLiveChatFrameReady = () => {
  const iframe = getLiveChatIframe()
  if (!iframe) return false
  const doc = getLiveChatDocument(iframe)
  if (!doc) return false
  if (isLiveChatUnavailable(doc)) return false
  return hasLiveChatRendererReady(doc)
}

export const hasLiveChatSignals = () => {
  const iframe = getLiveChatIframe()
  if (iframe) {
    const currentVideoId = getYouTubeVideoId()
    const iframeVideoId = getLiveChatVideoIdFromIframe(iframe)
    if (currentVideoId && iframeVideoId && iframeVideoId !== currentVideoId) return false
    const doc = getLiveChatDocument(iframe)
    if (doc && isLiveChatUnavailable(doc)) return false
  }

  if (hasLiveChatFrameReady()) return true
  if (hasWatchChatAttributes()) return true
  return false
}
