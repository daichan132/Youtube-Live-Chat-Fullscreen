import { getYouTubeVideoId } from './getYouTubeVideoId'

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

const getLiveChatVideoIdFromIframe = (iframe: HTMLIFrameElement) => {
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
const hasLiveChatAttributes = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    watchFlexy?.hasAttribute('live-chat-present') ||
      watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
      watchGrid?.hasAttribute('live-chat-present') ||
      watchGrid?.hasAttribute('live-chat-present-and-expanded'),
  )
}

export const hasPlayableLiveChat = () => {
  const iframe = getLiveChatIframe()
  if (iframe) {
    const doc = getLiveChatDocument(iframe)
    // If iframe exists but document isn't ready yet, fall back to attribute check
    // This can happen during page load or when chat is still initializing
    if (!doc) {
      const currentVideoId = getYouTubeVideoId()
      const iframeVideoId = getLiveChatVideoIdFromIframe(iframe)
      if (currentVideoId && iframeVideoId && iframeVideoId !== currentVideoId) return false
      return hasLiveChatAttributes()
    }
    if (!isLiveChatDocForCurrentVideo(doc)) return false
    if (isLiveChatUnavailable(doc)) return false
    const renderer = doc.querySelector('yt-live-chat-renderer')
    if (!renderer) return false
    const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
    if (!itemList) return false
    return true
  }

  return hasLiveChatAttributes()
}
