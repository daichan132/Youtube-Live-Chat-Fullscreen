import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { hasLiveChatSignals } from '@/entrypoints/content/utils/hasLiveChatSignals'
import { getLiveChatIframe, isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { isYouTubeLiveNow } from '@/entrypoints/content/utils/isYouTubeLiveNow'

export type ChatSource = { kind: 'live_direct'; videoId: string; url: string } | { kind: 'archive_borrow'; iframe: HTMLIFrameElement }

export type IframeLoadState = 'idle' | 'attaching' | 'initializing' | 'ready' | 'error'
export type ResolveChatSourceOptions = {
  allowBorrowedCurrent?: boolean
}

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

const hasReplayPath = (href: string | null | undefined) => Boolean(href?.includes('/live_chat_replay'))

const isReplayChatIframe = (iframe: HTMLIFrameElement) => {
  const docHref = getIframeDocumentHref(iframe)
  if (hasReplayPath(docHref)) return true

  const srcAttr = iframe.getAttribute('src') ?? ''
  if (hasReplayPath(srcAttr)) return true

  const src = iframe.src ?? ''
  return hasReplayPath(src)
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

export const resolveChatSource = (
  currentIframe: HTMLIFrameElement | null = null,
  options: ResolveChatSourceOptions = {},
): ChatSource | null => {
  const { allowBorrowedCurrent = true } = options
  const currentVideoId = getYouTubeVideoId()

  if (isYouTubeLiveNow()) {
    if (!currentVideoId) return null
    if (!hasLiveChatSignals()) return null
    return {
      kind: 'live_direct',
      videoId: currentVideoId,
      url: getLiveChatUrlForVideo(currentVideoId),
    }
  }

  const borrowedCurrentIframe = allowBorrowedCurrent && isBorrowedArchiveIframe(currentIframe) ? currentIframe : null
  const nativeIframe = getLiveChatIframe() ?? borrowedCurrentIframe
  if (!nativeIframe) return null
  if (!isIframeForCurrentVideo(nativeIframe, currentVideoId)) return null
  if (!isReplayChatIframe(nativeIframe)) return null
  if (!isArchiveChatPlayable(nativeIframe)) return null

  return {
    kind: 'archive_borrow',
    iframe: nativeIframe,
  }
}
