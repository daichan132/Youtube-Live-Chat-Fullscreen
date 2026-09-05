import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { collectArchiveChatControls, isChatControl } from '@/entrypoints/content/platform/youtube/chatControls'
import { playerProbe, queryFirstProbe, watchSurfaceProbe } from '@/entrypoints/content/platform/youtube/selectorCatalog'
import {
  getCurrentLiveChatHost,
  getCurrentLiveChatIframe,
  getNonBlankIframeHref,
  isChatHostForCurrentVideo,
  isIframeForCurrentVideo,
} from '../chat/shared/iframeDom'
import { getCurrentYouTubeVideoId } from './getYouTubeVideoId'

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

const isNativeChatMarkedExpanded = () =>
  watchSurfaceProbe.selectors.some(selector => document.querySelector(selector)?.hasAttribute('live-chat-present-and-expanded'))

const isNativeChatHostVisible = (host: HTMLElement) => {
  if (host.hasAttribute('hidden') || host.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(host)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

const hasCurrentNonBlankNativeChatIframe = () => {
  const chatFrame = getCurrentLiveChatIframe()
  return Boolean(chatFrame && isIframeForCurrentVideo(chatFrame, null) && getNonBlankIframeHref(chatFrame))
}

const isNativeChatAlreadyOpen = () => {
  const host = getCurrentLiveChatHost()
  return Boolean(isNativeChatMarkedExpanded() && host && hasCurrentNonBlankNativeChatIframe() && isNativeChatHostVisible(host))
}

const revealPlayerControls = (videoId: string) => {
  const moviePlayer = queryFirstProbe<HTMLElement>(document, playerProbe).element
  if (!moviePlayer) return
  for (const type of ['mouseover', 'mousemove', 'mouseenter']) {
    if (!moviePlayer.isConnected || getCurrentYouTubeVideoId() !== videoId) return
    moviePlayer.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, composed: true }))
  }
}

export const hasArchiveNativeOpenControl = () => collectArchiveChatControls().canOpen

export const openArchiveNativeChatPanel = () => {
  // Every candidate is a toggle. Validate identity and open state again after
  // dispatching page events, which can navigate or open chat synchronously.
  const videoId = getCurrentYouTubeVideoId()
  if (!videoId || isNativeChatAlreadyOpen()) return false

  const sidebar = collectArchiveChatControls().sidebar?.element
  if (sidebar?.isConnected) {
    sidebar.click()
    return true
  }

  revealPlayerControls(videoId)
  if (getCurrentYouTubeVideoId() !== videoId || isNativeChatAlreadyOpen()) return false

  // Revealing controls can also create a sidebar target. Preserve the same
  // candidate priority as observation rather than using a stale player target.
  const controls = collectArchiveChatControls()
  const control = controls.native?.element
  if (control?.isConnected) {
    control.click()
    return true
  }
  const host = controls.fallbackHost
  if (typeof host?.onShowHideChat !== 'function') return false
  host.onShowHideChat()
  return true
}

const hasChatOnPage = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false
  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false
  const host = button.closest<HTMLElement>('ytd-live-chat-frame')
  if (host && !isChatHostForCurrentVideo(host)) return false

  const isSidebarToggle = Boolean(button.closest('ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button'))
  if (isSidebarToggle) return true

  if (button.closest('.ytp-right-controls') && isChatControl(button)) return true
  if (!hasChatOnPage()) return false
  if (button.closest('#show-hide-button, #close-button')) return true
  return isChatControl(button)
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
