import { getYouTubeVideoId } from './getYouTubeVideoId'
import { isYouTubeLiveNow } from './isYouTubeLiveNow'

export const getLiveChatIframe = () => {
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (chatFrame) return chatFrame
  return document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
}

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

export const getLiveChatVideoIdFromDocument = (doc: Document) => {
  try {
    const href = doc.location?.href ?? ''
    if (!href) return null
    const url = new URL(href, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

export const getLiveChatVideoIdFromIframe = (iframe: HTMLIFrameElement) => {
  try {
    const src = iframe.src ?? ''
    if (!src) return null
    const url = new URL(src, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

const isLiveChatDocForCurrentVideo = (doc: Document) => {
  const currentVideoId = getYouTubeVideoId()
  if (!currentVideoId) return true
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

  if (!isLiveChatDocForCurrentVideo(doc)) return false
  if (isLiveChatUnavailable(doc)) return false

  return hasLiveChatRendererReady(doc)
}

export const hasPlayableLiveChat = () => {
  const iframe = getLiveChatIframe()
  if (iframe) {
    if (isArchiveChatPlayable(iframe)) return true

    const doc = getLiveChatDocument(iframe)
    // If iframe exists but document isn't ready yet:
    // - live: fail-open (chat can still initialize asynchronously)
    // - archive: keep waiting (about:blank must not be treated as playable)
    if (!doc) {
      const currentVideoId = getYouTubeVideoId()
      const iframeVideoId = getLiveChatVideoIdFromIframe(iframe)
      if (currentVideoId && iframeVideoId && iframeVideoId !== currentVideoId) return false
      if (isYouTubeLiveNow()) return true
      return false
    }
    return false
  }

  if (hasWatchChatAttributes()) return true
  if (isYouTubeLiveNow() && hasLiveChatDomContainer()) return true
  return false
}
