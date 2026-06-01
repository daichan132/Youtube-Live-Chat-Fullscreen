import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
import { hasArchiveNativeOpenControl } from '@/entrypoints/content/utils/nativeChat'
import { resolveArchiveSource } from '../archive/resolveArchiveSource'
import { resolveLiveSource } from '../live/resolveLiveSource'
import { getCurrentLiveChatIframe, isReplayChatIframe } from '../shared/iframeDom'
import type { ChatMode } from './types'

export const hasFullscreenChatSource = (mode: ChatMode): boolean => {
  if (mode === 'live') {
    return resolveLiveSource(getCurrentYouTubeVideoId()) !== null
  }
  if (mode === 'archive') {
    return resolveArchiveSource() !== null
  }
  return false
}

export const canToggleFullscreenChat = (mode: ChatMode): boolean => {
  if (mode === 'none') return false
  if (mode === 'live') return resolveLiveSource(getCurrentYouTubeVideoId()) !== null

  if (resolveArchiveSource() !== null) return true

  const nativeIframe = getCurrentLiveChatIframe(getCurrentYouTubeVideoId())
  if (nativeIframe) {
    const doc = getLiveChatDocument(nativeIframe)
    if (!doc) return hasArchiveNativeOpenControl()
    if (isLiveChatUnavailable(doc)) return false
    return isReplayChatIframe(nativeIframe)
  }

  return hasArchiveNativeOpenControl()
}
