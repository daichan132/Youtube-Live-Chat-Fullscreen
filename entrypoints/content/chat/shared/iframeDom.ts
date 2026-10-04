import {
  getYouTubeMoviePlayer,
  getYouTubePlayerVideoId,
  readYouTubePlayerVideoData,
} from '@/entrypoints/content/platform/youtube/playerVideoData'
import { nativeChatIframeProbe, queryAllProbes, watchSurfaceProbe } from '@/entrypoints/content/platform/youtube/selectorCatalog'
import { getYouTubeContentSurface } from '@/entrypoints/content/platform/youtube/youtubeSurface'
import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'

export const YLC_OWNED_ATTR = 'data-ylc-owned'
export const YLC_CHAT_ATTR = 'data-ylc-chat'
export const YLC_SOURCE_ATTR = 'data-ylc-source'
export const YLC_SOURCE_LIVE = 'live_direct'
export const YLC_OBSERVED_VIDEO_ATTR = 'data-ylc-observed-video-id'
const YLC_OBSERVED_MODE_ATTR = 'data-ylc-observed-chat-mode'

const getIframeHrefFromSrc = (iframe: HTMLIFrameElement) => iframe.getAttribute('src') ?? iframe.src ?? ''

export const getLiveChatIframes = () => queryAllProbes<HTMLIFrameElement>(document, nativeChatIframeProbe).elements

const getMoviePlayerVideoId = () => {
  const moviePlayer = getYouTubeMoviePlayer()
  return getYouTubePlayerVideoId(moviePlayer, readYouTubePlayerVideoData(moviePlayer))
}

const hasCurrentPageVideoMarker = (currentVideoId: string) => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  if (watchFlexy?.getAttribute('video-id') === currentVideoId) return true
  const watchGrid = document.querySelector('ytd-watch-grid')
  return watchGrid?.getAttribute('video-id') === currentVideoId || getMoviePlayerVideoId() === currentVideoId
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
const hasObservedArchiveMode = (element: Element | null | undefined) => element?.getAttribute(YLC_OBSERVED_MODE_ATTR) === 'archive'

const readChatUrl = (href: string) => {
  try {
    const url = new URL(href, window.location.origin)
    if (url.origin !== 'https://www.youtube.com' || (url.pathname !== '/live_chat' && url.pathname !== '/live_chat_replay')) return null
    const videoId = url.searchParams.get('v')
    const continuation = url.searchParams.get('continuation')
    return {
      mode: url.pathname === '/live_chat_replay' ? ('archive' as const) : ('live' as const),
      videoId,
      identity: videoId || continuation ? JSON.stringify([url.pathname, videoId, continuation]) : null,
    }
  } catch {
    return null
  }
}

type ParsedIframeSource = {
  documentUrl: ReturnType<typeof readChatUrl>
  iframeUrl: ReturnType<typeof readChatUrl>
  referrerVideoId: string | null
  referrerIsChannelLive: boolean
}
type CachedIframeSource = {
  document: WeakRef<Document> | null
  documentHref: string
  iframeHref: string
  referrer: string
  parsed: ParsedIframeSource
}
const parsedIframeSources = new WeakMap<HTMLIFrameElement, CachedIframeSource>()

const parseIframeSource = (documentHref: string, iframeHref: string, referrer: string): ParsedIframeSource => {
  const referrerSurface = getYouTubeContentSurface(referrer)
  return {
    documentUrl: readChatUrl(documentHref),
    iframeUrl: readChatUrl(iframeHref),
    referrerVideoId: referrerSurface?.videoId ?? null,
    referrerIsChannelLive: referrerSurface?.route === 'live' && referrerSurface.activationKey.startsWith('channel-live:'),
  }
}

const readIframeSource = (iframe: HTMLIFrameElement) => {
  let doc: Document | null = null
  let referrer = ''
  try {
    doc = iframe.contentDocument
    referrer = doc?.referrer ?? ''
  } catch {
    // Cross-origin or detached documents cannot establish a new identity.
  }
  const documentHref = getIframeDocumentHref(iframe)
  const iframeHref = getIframeHrefFromSrc(iframe)
  const cached = parsedIframeSources.get(iframe)
  const unchanged =
    cached &&
    (doc ? cached.document?.deref() === doc : cached.document === null) &&
    cached.documentHref === documentHref &&
    cached.iframeHref === iframeHref &&
    cached.referrer === referrer
  const parsed = unchanged ? cached.parsed : parseIframeSource(documentHref, iframeHref, referrer)
  if (!unchanged) {
    parsedIframeSources.set(iframe, {
      document: doc ? new WeakRef(doc) : null,
      documentHref,
      iframeHref,
      referrer,
      parsed,
    })
  }
  return {
    document: doc,
    ...parsed,
    host: getChatHost(iframe),
  }
}

type ObservedIframeSource = Omit<ReturnType<typeof readIframeSource>, 'document' | 'host'> & {
  document: WeakRef<Document> | null
  host: WeakRef<HTMLElement> | null
  videoId: string
}
const observedIframeSources = new WeakMap<HTMLIFrameElement, ObservedIframeSource>()

const hasCurrentDocumentReferrer = (currentVideoId: string, source: ReturnType<typeof readIframeSource>) =>
  source.referrerVideoId === currentVideoId || (source.referrerIsChannelLive && source.documentUrl?.videoId === currentVideoId)

const isCurrentNativeIframe = (iframe: HTMLIFrameElement, currentVideoId: string, source: ReturnType<typeof readIframeSource>) => {
  const host = source.host
  if (!host || !iframe.isConnected || !host.isConnected) return false
  if (iframe.getAttribute(YLC_CHAT_ATTR) === 'true' || iframe.getAttribute(YLC_OWNED_ATTR) === 'true') return false
  const watch = host.closest(watchSurfaceProbe.selectors.join(', '))
  const player = getYouTubeMoviePlayer()
  const playerVideoId = getMoviePlayerVideoId()
  if (
    getCurrentYouTubeVideoId() !== currentVideoId ||
    watch?.getAttribute('video-id') !== currentVideoId ||
    !player ||
    !watch.contains(player) ||
    (playerVideoId !== null && playerVideoId !== currentVideoId)
  )
    return false
  const declaredVideoIds = [
    iframe.getAttribute('video-id'),
    host.getAttribute('video-id'),
    source.documentUrl?.videoId,
    source.iframeUrl?.videoId,
  ]
  if (declaredVideoIds.some(videoId => videoId && videoId !== currentVideoId)) return false
  return true
}

const canReassignNativeIframe = (iframe: HTMLIFrameElement, currentVideoId: string, source: ReturnType<typeof readIframeSource>) => {
  const previous = observedIframeSources.get(iframe)
  const host = source.host
  if (
    !previous ||
    previous.videoId === currentVideoId ||
    !host ||
    host !== previous.host?.deref() ||
    !isCurrentNativeIframe(iframe, currentVideoId, source)
  )
    return false
  if (getObservedVideoId(host) && getObservedVideoId(host) !== previous.videoId) return false
  return Boolean(
    source.document &&
      source.document !== previous.document?.deref() &&
      source.document.readyState === 'complete' &&
      hasCurrentDocumentReferrer(currentVideoId, source) &&
      source.documentUrl?.identity &&
      previous.documentUrl?.identity &&
      source.documentUrl.identity !== previous.documentUrl.identity,
  )
}

const canObserveFreshNativeIframe = (iframe: HTMLIFrameElement, currentVideoId: string, source: ReturnType<typeof readIframeSource>) =>
  !observedIframeSources.has(iframe) &&
  !getObservedVideoId(iframe) &&
  source.document?.readyState === 'complete' &&
  source.documentUrl?.videoId === currentVideoId &&
  hasCurrentDocumentReferrer(currentVideoId, source) &&
  isCurrentNativeIframe(iframe, currentVideoId, source)

const setObservedMode = (element: Element | null, isReplay: boolean) => {
  if (!element) return
  if (isReplay) {
    if (!hasObservedArchiveMode(element)) element.setAttribute(YLC_OBSERVED_MODE_ATTR, 'archive')
  } else if (element.hasAttribute(YLC_OBSERVED_MODE_ATTR)) element.removeAttribute(YLC_OBSERVED_MODE_ATTR)
}

const markObservedElementForCurrentVideo = (element: Element | null | undefined, currentVideoId: string | null) => {
  if (!element || !currentVideoId || !hasCurrentPageVideoMarker(currentVideoId)) return false
  const observedVideoId = getObservedVideoId(element)
  if (observedVideoId) return observedVideoId === currentVideoId
  element.setAttribute(YLC_OBSERVED_VIDEO_ATTR, currentVideoId)
  return true
}

export const markChatIframeObservedForCurrentVideo = (iframe: HTMLIFrameElement, currentVideoId = getCurrentYouTubeVideoId()) => {
  if (!currentVideoId) return
  const source = readIframeSource(iframe)
  const observedVideoIds = [getObservedVideoId(iframe), getObservedVideoId(source.host)]
  const hasObservedConflict = observedVideoIds.some(videoId => videoId !== null && videoId !== currentVideoId)
  const reassign =
    hasObservedConflict &&
    (canReassignNativeIframe(iframe, currentVideoId, source) || canObserveFreshNativeIframe(iframe, currentVideoId, source))
  // A replacement inherits the host's previous identity while blank or loading.
  // Current page markers alone cannot turn that old source into a new one.
  if (hasObservedConflict && !reassign) return
  if (reassign) {
    iframe.setAttribute(YLC_OBSERVED_VIDEO_ATTR, currentVideoId)
    source.host?.setAttribute(YLC_OBSERVED_VIDEO_ATTR, currentVideoId)
  }
  const explicitMode = source.documentUrl?.mode ?? source.iframeUrl?.mode
  const isReplay = explicitMode ? explicitMode === 'archive' : isReplayChatIframe(iframe)
  if (!isReplay && !isLiveChatIframe(iframe)) return
  const declaredVideoId = getDeclaredIframeVideoId(iframe)
  if (declaredVideoId && declaredVideoId !== currentVideoId) return
  if (!markObservedElementForCurrentVideo(iframe, currentVideoId)) return
  setObservedMode(iframe, isReplay)
  const host = getChatHost(iframe)
  if (markObservedElementForCurrentVideo(host, currentVideoId)) setObservedMode(host, isReplay)
  const previous = observedIframeSources.get(iframe)
  const completedReload =
    source.document?.readyState === 'complete' &&
    hasCurrentDocumentReferrer(currentVideoId, source) &&
    source.documentUrl?.identity &&
    (!previous?.documentUrl?.identity ||
      (source.document !== previous.document?.deref() && source.documentUrl.identity !== previous.documentUrl.identity))
  // A completed same-video reload becomes the new baseline. Partial loads or
  // page/source conflicts retain the previous successful source snapshot.
  if (!previous || reassign || (completedReload && isCurrentNativeIframe(iframe, currentVideoId, source))) {
    observedIframeSources.set(iframe, {
      ...source,
      // Source evidence must not retain a replaced chat document and messages.
      document: source.document ? new WeakRef(source.document) : null,
      host: source.host ? new WeakRef(source.host) : null,
      videoId: currentVideoId,
    })
  }
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
  if (hasLivePath(docHref)) return false

  const srcHref = getIframeHrefFromSrc(iframe)
  if (hasReplayPath(srcHref)) return true
  if (hasLivePath(srcHref)) return false
  return hasObservedArchiveMode(iframe) || hasObservedArchiveMode(getChatHost(iframe))
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
  const source = readIframeSource(iframe)
  const observedVideoIds = [getObservedVideoId(iframe), getObservedVideoId(source.host)]
  const videoId = getDeclaredIframeVideoId(iframe) ?? observedVideoIds[0] ?? observedVideoIds[1]
  if (!videoId) return null
  // Declared URLs cannot bypass a rejected native-source reassignment. A host's
  // video-id remains a fallback, since YouTube may update its child first.
  const iframeVideoIds = [iframe.getAttribute('video-id'), source.documentUrl?.videoId, source.iframeUrl?.videoId]
  if (iframeVideoIds.some(id => id && id !== videoId) || observedVideoIds.some(id => id && id !== videoId)) return null
  return videoId
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
