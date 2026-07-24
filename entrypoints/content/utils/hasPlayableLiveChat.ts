import { getCurrentLiveChatIframe, getLiveChatIframes, isIframeForCurrentVideo } from '../chat/shared/iframeDom'
import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'
import { isYouTubeLiveNow } from './isYouTubeLiveNow'

export const getLiveChatDocument = (iframe: HTMLIFrameElement) => {
  try {
    const doc = iframe.contentDocument ?? null
    const href = doc?.location?.href ?? ''
    if (!doc || !href || href.includes('about:blank')) return null
    return doc
  } catch {
    // CORS restriction or iframe removed - cannot access document
    return null
  }
}

const getLiveChatVideoIdFromDocument = (doc: Document) => {
  try {
    const href = doc.location?.href ?? ''
    if (!href) return null
    const url = new URL(href, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

const isLiveChatDocForCurrentVideo = (doc: Document, currentVideoId = getCurrentYouTubeVideoId()) => {
  if (!currentVideoId) return false
  const liveChatVideoId = getLiveChatVideoIdFromDocument(doc)
  if (!liveChatVideoId) return true
  return liveChatVideoId === currentVideoId
}

const hasUnavailableText = (doc: Document) => {
  const bodyText = doc.body?.textContent?.toLowerCase() ?? ''
  if (!bodyText) return false
  return (
    bodyText.includes('live chat replay is not available') ||
    bodyText.includes('chat is disabled') ||
    bodyText.includes('live chat is disabled')
  )
}

export const isLiveChatUnavailable = (doc: Document) => {
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
  if (doc.querySelector('yt-live-chat-message-renderer') && !doc.querySelector('yt-live-chat-renderer')) return true
  return hasUnavailableText(doc)
}

/** Checks if watch element has live chat attributes */
export const hasWatchChatAttributes = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    watchFlexy?.hasAttribute('live-chat-present') ||
      watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
      watchGrid?.hasAttribute('live-chat-present') ||
      watchGrid?.hasAttribute('live-chat-present-and-expanded'),
  )
}

const hasLiveChatDomContainer = () => {
  return Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))
}

export const hasLiveChatRendererReady = (doc: Document) => {
  const renderer = doc.querySelector('yt-live-chat-renderer')
  const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
  return Boolean(renderer && itemList)
}

export const isArchiveChatPlayable = (iframe: HTMLIFrameElement | null) => {
  if (!iframe) return false

  const doc = getLiveChatDocument(iframe)
  if (!doc) return false

  const currentVideoId = getCurrentYouTubeVideoId()
  if (!isIframeForCurrentVideo(iframe, currentVideoId)) return false
  if (!isLiveChatDocForCurrentVideo(doc, currentVideoId)) return false
  if (isLiveChatUnavailable(doc)) return false

  return hasLiveChatRendererReady(doc)
}

export const hasPlayableLiveChat = () => {
  const currentVideoId = getCurrentYouTubeVideoId()
  const iframe = getCurrentLiveChatIframe(currentVideoId)
  if (iframe) {
    if (isArchiveChatPlayable(iframe)) return true

    const doc = getLiveChatDocument(iframe)
    // If iframe exists but document isn't ready yet:
    // - live: fail-open (chat can still initialize asynchronously)
    // - archive: keep waiting (about:blank must not be treated as playable)
    if (!doc) {
      if (!isIframeForCurrentVideo(iframe, currentVideoId)) return false
      if (isYouTubeLiveNow()) return true
      return false
    }
    return false
  }

  if (getLiveChatIframes().length > 0) {
    return isYouTubeLiveNow() && hasLiveChatDomContainer()
  }

  if (hasWatchChatAttributes()) return true
  if (isYouTubeLiveNow() && hasLiveChatDomContainer()) return true
  return false
}
