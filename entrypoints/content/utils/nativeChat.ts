import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import {
  collectArchiveChatControls,
  isChatControl,
  type YouTubeLiveChatFrameElement,
} from '@/entrypoints/content/platform/youtube/chatControls'
import { playerProbe, queryFirstProbe, watchSurfaceProbe } from '@/entrypoints/content/platform/youtube/selectorCatalog'
import { getCurrentLiveChatHost, getCurrentLiveChatIframe, getNonBlankIframeHref, isIframeForCurrentVideo } from '../chat/shared/iframeDom'

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

const revealPlayerControls = () => {
  const moviePlayer = queryFirstProbe<HTMLElement>(document, playerProbe).element
  if (!moviePlayer) return
  for (const type of ['mouseover', 'mousemove', 'mouseenter']) {
    moviePlayer.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, composed: true }))
  }
}

export const hasArchiveNativeOpenControl = () => collectArchiveChatControls().canOpen

export const openArchiveNativeChatPanel = () => {
  // The sidebar control is a toggle: do not close a chat already marked open.
  const currentHost = getCurrentLiveChatHost()
  if (isNativeChatMarkedExpanded() && currentHost && hasCurrentNonBlankNativeChatIframe() && isNativeChatHostVisible(currentHost)) {
    return false
  }

  const sidebar = collectArchiveChatControls().sidebar?.element
  if (sidebar?.isConnected) {
    sidebar.click()
    return true
  }

  revealPlayerControls()
  // Revealing controls can synchronously replace YouTube's DOM. Observe again
  // at the action boundary rather than clicking a previously captured element.
  const playerControl = collectArchiveChatControls().player?.element
  if (playerControl?.isConnected) {
    playerControl.click()
    return true
  }
  const host = getCurrentLiveChatHost() as YouTubeLiveChatFrameElement | null
  if (typeof host?.onShowHideChat !== 'function') return false
  host.onShowHideChat()
  return true
}

const hasChatOnPage = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false
  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false

  const isSidebarToggle = Boolean(button.closest('ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button'))
  if (isSidebarToggle) return true

  if (button.closest('.ytp-right-controls') && isChatControl(button)) return true
  if (!hasChatOnPage()) return false
  if (button.closest('#show-hide-button, #close-button')) return true
  return isChatControl(button)
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
