import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'

export const YLC_OWNED_ATTR = 'data-ylc-owned'
export const YLC_CHAT_ATTR = 'data-ylc-chat'
export const YLC_SOURCE_ATTR = 'data-ylc-source'
export const YLC_SOURCE_LIVE = 'live_direct'
export const YLC_OBSERVED_VIDEO_ATTR = 'data-ylc-observed-video-id'

const getIframeHrefFromSrc = (iframe: HTMLIFrameElement) => iframe.getAttribute('src') ?? iframe.src ?? ''
let chatIframeObserver: MutationObserver | null = null

export const getLiveChatIframes = () => {
  const iframes = new Set<HTMLIFrameElement>()
  for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>('#chatframe'))) {
    iframes.add(iframe)
  }
  for (const iframe of Array.from(document.querySelectorAll<HTMLIFrameElement>('ytd-live-chat-frame iframe.ytd-live-chat-frame'))) {
    iframes.add(iframe)
  }
  return Array.from(iframes)
}

const getMoviePlayerVideoId = () => {
  const moviePlayer = document.getElementById('movie_player') as
    | (HTMLElement & { getVideoData?: () => { video_id?: string; videoId?: string } })
    | null
  const videoData = moviePlayer?.getVideoData?.()
  return videoData?.video_id ?? videoData?.videoId ?? moviePlayer?.getAttribute('video-id') ?? null
}

const hasCurrentPageVideoMarker = (currentVideoId: string) => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  return (
    watchFlexy?.getAttribute('video-id') === currentVideoId ||
    watchGrid?.getAttribute('video-id') === currentVideoId ||
    getMoviePlayerVideoId() === currentVideoId
  )
}

const getChatHost = (iframe: HTMLIFrameElement) => iframe.closest('ytd-live-chat-frame') as HTMLElement | null

const getDeclaredIframeVideoId = (iframe: HTMLIFrameElement) => {
  const declaredVideoId = iframe.getAttribute('video-id')
  if (declaredVideoId) return declaredVideoId

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
    if (src) {
      const url = new URL(src, window.location.origin)
      const videoId = url.searchParams.get('v')
      if (videoId) return videoId
    }
  } catch {
    // Ignore malformed src and fall back to host markers.
  }

  return getChatHost(iframe)?.getAttribute('video-id') ?? null
}

const getObservedVideoId = (element: Element | null | undefined) => element?.getAttribute(YLC_OBSERVED_VIDEO_ATTR) ?? null

const markObservedElementForCurrentVideo = (element: Element | null | undefined, currentVideoId: string | null) => {
  if (!element || !currentVideoId || !hasCurrentPageVideoMarker(currentVideoId)) return false
  const observedVideoId = getObservedVideoId(element)
  if (observedVideoId) return observedVideoId === currentVideoId
  element.setAttribute(YLC_OBSERVED_VIDEO_ATTR, currentVideoId)
  return true
}

export const markChatIframeObservedForCurrentVideo = (iframe: HTMLIFrameElement, currentVideoId = getCurrentYouTubeVideoId()) => {
  if (getDeclaredIframeVideoId(iframe)) return
  if (!isReplayChatIframe(iframe) && !isLiveChatIframe(iframe)) return
  if (!markObservedElementForCurrentVideo(iframe, currentVideoId)) return
  markObservedElementForCurrentVideo(getChatHost(iframe), currentVideoId)
}

const markChatHostObservedForCurrentVideo = (host: Element, currentVideoId = getCurrentYouTubeVideoId()) => {
  markObservedElementForCurrentVideo(host, currentVideoId)
  for (const iframe of Array.from(host.querySelectorAll<HTMLIFrameElement>('iframe'))) {
    markChatIframeObservedForCurrentVideo(iframe, currentVideoId)
  }
}

const markObservedChatNodes = (root: ParentNode, currentVideoId = getCurrentYouTubeVideoId()) => {
  if (root instanceof HTMLIFrameElement) {
    markChatIframeObservedForCurrentVideo(root, currentVideoId)
  }
  if (root instanceof Element && root.matches('ytd-live-chat-frame')) {
    markChatHostObservedForCurrentVideo(root, currentVideoId)
  }
  for (const host of Array.from(root.querySelectorAll?.('ytd-live-chat-frame') ?? [])) {
    markChatHostObservedForCurrentVideo(host, currentVideoId)
  }
  for (const iframe of Array.from(root.querySelectorAll?.('iframe') ?? [])) {
    markChatIframeObservedForCurrentVideo(iframe as HTMLIFrameElement, currentVideoId)
  }
}

const shouldRetryObservedChatMarkers = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false
  return target.matches('ytd-watch-flexy, ytd-watch-grid') || target.id === 'movie_player'
}

const containsPageVideoMarker = (element: Element) =>
  shouldRetryObservedChatMarkers(element) || Boolean(element.querySelector('ytd-watch-flexy, ytd-watch-grid, #movie_player'))

export const ensureChatIframeObservation = () => {
  if (chatIframeObserver || !document.documentElement) return

  markObservedChatNodes(document)
  chatIframeObserver = new MutationObserver(mutations => {
    const currentVideoId = getCurrentYouTubeVideoId()
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLIFrameElement) {
        markChatIframeObservedForCurrentVideo(mutation.target, currentVideoId)
        continue
      }
      if (mutation.type === 'attributes' && shouldRetryObservedChatMarkers(mutation.target)) {
        markObservedChatNodes(document, currentVideoId)
        continue
      }
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof Element) {
          if (containsPageVideoMarker(node)) {
            markObservedChatNodes(document, currentVideoId)
            continue
          }
          markObservedChatNodes(node, currentVideoId)
        }
      }
    }
  })
  chatIframeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['src', 'video-id'],
    childList: true,
    subtree: true,
  })
}

export const isChatHostForCurrentVideo = (host: HTMLElement | null | undefined) => {
  if (!host) return false
  const currentVideoId = getCurrentYouTubeVideoId()
  if (!currentVideoId) return false
  const hasCurrentIframe = Array.from(host.querySelectorAll<HTMLIFrameElement>('iframe')).some(iframe =>
    isIframeForCurrentVideo(iframe, currentVideoId),
  )
  const hostVideoId = host.getAttribute('video-id') ?? getObservedVideoId(host)
  if (hostVideoId) return hostVideoId === currentVideoId || hasCurrentIframe

  return hasCurrentIframe
}

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
  return getDeclaredIframeVideoId(iframe) ?? getObservedVideoId(iframe) ?? getObservedVideoId(getChatHost(iframe))
}

export const isIframeForCurrentVideo = (iframe: HTMLIFrameElement, currentVideoId: string | null) => {
  const pageVideoId = getCurrentYouTubeVideoId()
  if (!pageVideoId) return false
  if (currentVideoId && currentVideoId !== pageVideoId) return false
  const iframeVideoId = getIframeVideoId(iframe)
  if (!iframeVideoId) return false
  return iframeVideoId === pageVideoId
}

export const getCurrentLiveChatIframe = (currentVideoId = getCurrentYouTubeVideoId()) =>
  getLiveChatIframes().find(iframe => isIframeForCurrentVideo(iframe, currentVideoId)) ?? null

export const getCurrentLiveChatHost = () =>
  Array.from(document.querySelectorAll<HTMLElement>('ytd-live-chat-frame')).find(host => isChatHostForCurrentVideo(host)) ?? null
