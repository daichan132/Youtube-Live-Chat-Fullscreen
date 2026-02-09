import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, getLiveChatIframe, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import { resolveArchiveSource } from '../archive/resolveArchiveSource'
import { resolveLiveSource } from '../live/resolveLiveSource'
import { isIframeForCurrentVideo } from '../shared/iframeDom'
import type { ChatMode } from './types'

export const hasFullscreenChatSource = (mode: ChatMode): boolean => {
  if (mode === 'live') {
    return resolveLiveSource(getYouTubeVideoId()) !== null
  }
  if (mode === 'archive') {
    return resolveArchiveSource() !== null
  }
  return false
}

export const canToggleFullscreenChat = (mode: ChatMode): boolean => {
  if (mode === 'none') return false
  if (mode === 'live') return resolveLiveSource(getYouTubeVideoId()) !== null

  if (resolveArchiveSource() !== null) return true

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe) {
    if (!isIframeForCurrentVideo(nativeIframe, getYouTubeVideoId())) return false
    const doc = getLiveChatDocument(nativeIframe)
    if (!doc) return false
    if (isLiveChatUnavailable(doc)) return false
    return true
  }

  return hasArchiveNativeOpenControl()
}
