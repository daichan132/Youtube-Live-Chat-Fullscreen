import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatIframe, isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'

export type ChatSource = { kind: 'live_direct'; videoId: string; url: string } | { kind: 'archive_borrow'; iframe: HTMLIFrameElement }

export type IframeLoadState = 'idle' | 'attaching' | 'initializing' | 'ready' | 'error'

const getIframeDocumentHref = (iframe: HTMLIFrameElement) => {
  try {
    return iframe.contentDocument?.location?.href ?? ''
  } catch {
    return ''
  }
}

const getIframeVideoId = (iframe: HTMLIFrameElement) => {
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
    const src = iframe.src ?? ''
    if (!src) return null
    const url = new URL(src, window.location.origin)
    return url.searchParams.get('v')
  } catch {
    return null
  }
}

const isIframeForCurrentVideo = (iframe: HTMLIFrameElement, currentVideoId: string | null) => {
  if (!currentVideoId) return true
  const iframeVideoId = getIframeVideoId(iframe)
  if (!iframeVideoId) return true
  return iframeVideoId === currentVideoId
}

const isBorrowedArchiveIframe = (iframe: HTMLIFrameElement | null | undefined): iframe is HTMLIFrameElement => {
  if (!iframe) return false
  if (iframe.getAttribute('data-ylc-owned') === 'true') return false
  return iframe.isConnected
}

export const getLiveChatUrlForVideo = (videoId: string) => {
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', videoId)
  return url.toString()
}

export const resolveChatSource = (currentIframe: HTMLIFrameElement | null = null): ChatSource | null => {
  const currentVideoId = getYouTubeVideoId()

  if (isYouTubeLiveNow()) {
    if (!currentVideoId) return null
    return {
      kind: 'live_direct',
      videoId: currentVideoId,
      url: getLiveChatUrlForVideo(currentVideoId),
    }
  }

  const nativeIframe = getLiveChatIframe() ?? (isBorrowedArchiveIframe(currentIframe) ? currentIframe : null)
  if (!nativeIframe) return null
  if (!isIframeForCurrentVideo(nativeIframe, currentVideoId)) return null
  if (!isArchiveChatPlayable(nativeIframe)) return null

  return {
    kind: 'archive_borrow',
    iframe: nativeIframe,
  }
}
