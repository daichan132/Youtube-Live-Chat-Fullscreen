import {
  chatItemListRendererProbe,
  chatRendererProbe,
  chatStatusMessageProbe,
  chatUnavailableMessageProbe,
  queryFirstProbe,
} from './selectorCatalog'

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

const hasUnavailableText = (doc: Document) => {
  const bodyText = doc.body?.textContent?.toLowerCase() ?? ''
  if (!bodyText) return false
  return (
    bodyText.includes('live chat replay is not available') ||
    bodyText.includes('chat is disabled') ||
    bodyText.includes('live chat is disabled')
  )
}

export const observeLiveChatDocument = (doc: Document) => {
  const unavailable = queryFirstProbe(doc, chatUnavailableMessageProbe).element !== null
  const renderer = queryFirstProbe(doc, chatRendererProbe).element
  const itemList = queryFirstProbe(doc, chatItemListRendererProbe).element
  const ready = Boolean(renderer && itemList)
  // Ready chat messages can quote unavailable text. Skip their accumulated
  // body text while retaining plain error pages before the item list is ready.
  return {
    ready,
    unavailable:
      unavailable || (!ready && ((!renderer && queryFirstProbe(doc, chatStatusMessageProbe).element !== null) || hasUnavailableText(doc))),
  }
}
