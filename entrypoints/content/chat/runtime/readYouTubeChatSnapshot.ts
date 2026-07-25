import { getCurrentYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { detectChatMode } from './detectChatMode'
import { canToggleFullscreenChat, hasFullscreenChatSource } from './hasFullscreenChatSource'
import { getUnavailableCurrentLiveChatVideoId } from './liveChatAvailability'
import type { ChatMode } from './types'

export type YouTubeChatSnapshot = {
  videoId: string | null
  mode: ChatMode
  canShowSwitch: boolean
  sourceReady: boolean
  terminallyUnavailable: boolean
  detectedUnavailableVideoId: string | null
}

export const readYouTubeChatSnapshot = (storedUnavailableVideoId: string | null): YouTubeChatSnapshot => {
  const videoId = getCurrentYouTubeVideoId()
  const mode = detectChatMode()

  if (!videoId || mode === 'none') {
    return {
      videoId,
      mode,
      canShowSwitch: false,
      sourceReady: false,
      terminallyUnavailable: false,
      detectedUnavailableVideoId: null,
    }
  }

  const detectedUnavailableVideoId = mode === 'live' ? getUnavailableCurrentLiveChatVideoId() : null
  const terminallyUnavailable = mode === 'live' && (storedUnavailableVideoId === videoId || detectedUnavailableVideoId === videoId)

  if (terminallyUnavailable) {
    return {
      videoId,
      mode,
      canShowSwitch: false,
      sourceReady: false,
      terminallyUnavailable: true,
      detectedUnavailableVideoId,
    }
  }

  return {
    videoId,
    mode,
    canShowSwitch: canToggleFullscreenChat(mode),
    sourceReady: hasFullscreenChatSource(mode),
    terminallyUnavailable: false,
    detectedUnavailableVideoId,
  }
}
