import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatIframe, isArchiveChatPlayable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import type { ArchiveChatSource } from '../runtime/types'
import { isIframeForCurrentVideo, isReplayChatIframe } from '../shared/iframeDom'

export type ResolveArchiveSourceOptions = {
  allowBorrowedCurrent?: boolean
}

const isBorrowedArchiveIframe = (iframe: HTMLIFrameElement | null | undefined): iframe is HTMLIFrameElement => {
  if (!iframe) return false
  if (iframe.getAttribute('data-ylc-owned') === 'true') return false
  return iframe.isConnected
}

export const resolveArchiveSource = (
  currentIframe: HTMLIFrameElement | null = null,
  options: ResolveArchiveSourceOptions = {},
): ArchiveChatSource | null => {
  const { allowBorrowedCurrent = true } = options
  const currentVideoId = getYouTubeVideoId()
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
