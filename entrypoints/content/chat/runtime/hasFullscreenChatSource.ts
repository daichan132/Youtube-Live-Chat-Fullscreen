import { getYouTubeVideoId } from '@/entrypoints/content/utils/getYouTubeVideoId'
import { getLiveChatDocument, getLiveChatIframe, isLiveChatUnavailable } from '@/entrypoints/content/utils/hasPlayableLiveChat'
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

const archiveSidebarOpenSelectors = [
  'ytd-live-chat-frame #show-hide-button button',
  'ytd-live-chat-frame #show-hide-button yt-icon-button',
  'ytd-live-chat-frame #show-hide-button tp-yt-paper-icon-button',
  '#chat-container #show-hide-button button',
  '#chat-container #show-hide-button yt-icon-button',
  '#chat-container #show-hide-button tp-yt-paper-icon-button',
  'ytd-live-chat-frame #show-hide-button',
  '#chat-container #show-hide-button',
]

const archivePlayerChatToggleSelectors = [
  '.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
  '.ytp-right-controls button-view-model button[aria-pressed="false"]',
  '#movie_player toggle-button-view-model button[aria-pressed="false"]',
  '#movie_player button-view-model button[aria-pressed="false"]',
]

const hasChatLabel = (element: HTMLElement) => {
  const label =
    `${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${element.getAttribute('data-title-no-tooltip') ?? ''} ${element.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()
  return label.includes('chat') || label.includes('チャット')
}

const hasArchiveOpenControl = () => {
  for (const selector of archiveSidebarOpenSelectors) {
    if (document.querySelector(selector)) return true
  }

  for (const selector of archivePlayerChatToggleSelectors) {
    const buttons = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
    if (buttons.some(hasChatLabel)) return true
  }

  return false
}

export const canToggleFullscreenChat = (mode: ChatMode): boolean => {
  if (mode === 'none') return false
  if (mode === 'live') return hasFullscreenChatSource('live')

  if (hasFullscreenChatSource('archive')) return true

  const nativeIframe = getLiveChatIframe()
  if (nativeIframe) {
    if (!isIframeForCurrentVideo(nativeIframe, getYouTubeVideoId())) return false
    const doc = getLiveChatDocument(nativeIframe)
    if (doc && isLiveChatUnavailable(doc)) return false
    return true
  }

  return hasArchiveOpenControl()
}
