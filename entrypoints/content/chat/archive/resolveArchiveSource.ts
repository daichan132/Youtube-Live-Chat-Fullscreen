import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import type { ArchiveChatSource } from '../runtime/types'
import { getLiveChatIframes, isIframeForCurrentVideo, isReplayChatIframe, YLC_CHAT_ATTR, YLC_OWNED_ATTR } from '../shared/iframeDom'

const isBorrowedArchiveIframe = (iframe: HTMLIFrameElement | null | undefined): iframe is HTMLIFrameElement => {
  if (!iframe) return false
  if (iframe.getAttribute(YLC_CHAT_ATTR) !== 'true') return false
  if (iframe.getAttribute(YLC_OWNED_ATTR) === 'true') return false
  return iframe.isConnected
}

const resolvePlayableArchiveIframe = (iframe: HTMLIFrameElement | null, currentVideoId: string | null) => {
  if (!iframe) return null
  if (!isIframeForCurrentVideo(iframe, currentVideoId)) return null
  if (!isReplayChatIframe(iframe)) return null
  if (!isArchiveChatPlayable(iframe)) return null
  return iframe
}

export const resolveArchiveSource = (currentIframe: HTMLIFrameElement | null = null): ArchiveChatSource | null => {
  const currentVideoId = getCurrentYouTubeVideoId()
  const nativeIframe =
    getLiveChatIframes()
      .map(iframe => resolvePlayableArchiveIframe(iframe, currentVideoId))
      .find((iframe): iframe is HTMLIFrameElement => iframe !== null) ?? null
  const borrowedCurrentIframe = isBorrowedArchiveIframe(currentIframe) ? resolvePlayableArchiveIframe(currentIframe, currentVideoId) : null
  const iframe = nativeIframe ?? borrowedCurrentIframe
  if (!iframe) return null

  return {
    kind: 'archive_borrow',
    iframe,
  }
}
