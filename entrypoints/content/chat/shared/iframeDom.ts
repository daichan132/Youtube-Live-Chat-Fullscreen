export const YLC_OWNED_ATTR = 'data-ylc-owned'
export const YLC_SOURCE_ATTR = 'data-ylc-source'
export const YLC_SOURCE_LIVE = 'live_direct'

const getIframeHrefFromSrc = (iframe: HTMLIFrameElement) => iframe.getAttribute('src') ?? iframe.src ?? ''

export const getIframeDocumentHref = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument?.location?.href ?? ''
  } catch {
    return ''
  }
}

export const getNonBlankIframeHref = (iframe: HTMLIFrameElement) => {
  const docHref = getIframeDocumentHref(iframe)
  if (docHref && !docHref.includes('about:blank')) return docHref

  const srcAttr = iframe.getAttribute('src') ?? ''
  if (srcAttr && !srcAttr.includes('about:blank')) return srcAttr

  const src = iframe.src ?? ''
  if (src && !src.includes('about:blank')) return src

  return ''
}

export const isManagedIframe = (iframe: HTMLIFrameElement | null) => iframe?.getAttribute(YLC_OWNED_ATTR) === 'true'

export const isManagedLiveIframe = (iframe: HTMLIFrameElement | null | undefined) =>
  isManagedIframe(iframe as HTMLIFrameElement | null) && iframe?.getAttribute(YLC_SOURCE_ATTR) === YLC_SOURCE_LIVE

export const hasReplayPath = (href: string | null | undefined) => Boolean(href?.includes('/live_chat_replay'))
export const hasLivePath = (href: string | null | undefined) => Boolean(href?.includes('/live_chat'))

export const isReplayChatIframe = (iframe: HTMLIFrameElement) => {
  const docHref = getIframeDocumentHref(iframe)
  if (hasReplayPath(docHref)) return true

  const srcHref = getIframeHrefFromSrc(iframe)
  return hasReplayPath(srcHref)
}

export const isLiveChatIframe = (iframe: HTMLIFrameElement | null | undefined) => {
  if (!iframe) return false

  const docHref = getIframeDocumentHref(iframe)
  if (docHref) {
    if (hasReplayPath(docHref)) return false
    if (hasLivePath(docHref)) return true
  }

  const srcHref = getIframeHrefFromSrc(iframe)
  if (!srcHref) return false
  if (hasReplayPath(srcHref)) return false
  return hasLivePath(srcHref)
}

export const getIframeVideoId = (iframe: HTMLIFrameElement) => {
  try {
    const docHref = getIframeDocumentHref(iframe)
    if (docHref) {
      const url = new URL(docHref, window.location.origin)
      const videoId = url.searchParams.get('v')
      if (videoId) return videoId
    }
  } catch {
    // Ignore CORS/DOM access errors and fall back to src.
  }

  try {
    const src = getIframeHrefFromSrc(iframe)
    if (!src) return null
    const url = new URL(src, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

export const isIframeForCurrentVideo = (iframe: HTMLIFrameElement, currentVideoId: string | null) => {
  if (!currentVideoId) return true
  const iframeVideoId = getIframeVideoId(iframe)
  if (!iframeVideoId) return true
  return iframeVideoId === currentVideoId
}
