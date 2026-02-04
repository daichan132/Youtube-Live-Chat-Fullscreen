const getLiveChatIframe = () => {
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (chatFrame) return chatFrame
  return document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
}

const getLiveChatDocument = (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument ?? null
  const href = doc?.location?.href ?? ''
  if (!doc || !href || href.includes('about:blank')) return null
  return doc
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

const isLiveChatUnavailable = (doc: Document) => {
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return true
  return hasUnavailableText(doc)
}

export const hasPlayableLiveChat = () => {
  const iframe = getLiveChatIframe()
  if (iframe) {
    const doc = getLiveChatDocument(iframe)
    if (!doc) return false
    if (isLiveChatUnavailable(doc)) return false
    const renderer = doc.querySelector('yt-live-chat-renderer')
    if (!renderer) return false
    const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
    if (!itemList) return false
    return true
  }

  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return Boolean(
    watchFlexy?.hasAttribute('live-chat-present') ||
      watchFlexy?.hasAttribute('live-chat-present-and-expanded') ||
      watchGrid?.hasAttribute('live-chat-present') ||
      watchGrid?.hasAttribute('live-chat-present-and-expanded'),
  )
}
