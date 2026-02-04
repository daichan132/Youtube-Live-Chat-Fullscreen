import { getLiveChatDocument, getLiveChatIframe, isLiveChatUnavailable } from './hasPlayableLiveChat'

const hasWatchChatAttributes = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    watchFlexy?.hasAttribute('live-chat-present') ||
      watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
      watchGrid?.hasAttribute('live-chat-present') ||
      watchGrid?.hasAttribute('live-chat-present-and-expanded'),
  )
}

const hasLiveChatFrameReady = () => {
  const iframe = getLiveChatIframe()
  if (!iframe) return false
  const doc = getLiveChatDocument(iframe)
  if (!doc) return false
  if (isLiveChatUnavailable(doc)) return false
  const renderer = doc.querySelector('yt-live-chat-renderer')
  const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
  return Boolean(renderer && itemList)
}

export const hasLiveChatSignals = () => {
  const iframe = getLiveChatIframe()
  if (iframe) {
    const doc = getLiveChatDocument(iframe)
    if (doc && isLiveChatUnavailable(doc)) return false
  }

  if (hasLiveChatFrameReady()) return true
  if (hasWatchChatAttributes()) return true
  return false
}
