/**
 * Utilities for detecting the state of YouTube's native chat panel.
 *
 * These functions help determine whether the native chat is visible, expanded,
 * or usable, which is important for deciding when to show the extension's
 * fullscreen chat overlay.
 */

/**
 * Minimum dimensions for native chat to be considered usable.
 * These thresholds ensure the chat panel has enough space to be interactive.
 */
const MIN_USABLE_WIDTH = 80
const MIN_USABLE_HEIGHT = 120

/** DOM elements related to YouTube's native chat */
type NativeChatElements = {
  secondary: HTMLElement | null
  chatContainer: HTMLElement | null
  chatFrameHost: HTMLElement | null
  chatFrame: HTMLIFrameElement | null
}

/** Retrieves all native chat-related DOM elements */
export const getNativeChatElements = (): NativeChatElements => ({
  secondary: document.querySelector('#secondary') as HTMLElement | null,
  chatContainer: document.querySelector('#chat-container') as HTMLElement | null,
  chatFrameHost: document.querySelector('ytd-live-chat-frame') as HTMLElement | null,
  chatFrame: document.querySelector('#chatframe') as HTMLIFrameElement | null,
})

const isChatHiddenByAttribute = (chatContainer: HTMLElement | null, chatFrameHost: HTMLElement | null) =>
  chatContainer?.hasAttribute('hidden') ||
  chatFrameHost?.hasAttribute('hidden') ||
  chatContainer?.getAttribute('aria-hidden') === 'true' ||
  chatFrameHost?.getAttribute('aria-hidden') === 'true'

const isChatHiddenByStyle = (containerStyle: CSSStyleDeclaration, hostStyle: CSSStyleDeclaration) =>
  containerStyle.display === 'none' ||
  containerStyle.visibility === 'hidden' ||
  hostStyle.display === 'none' ||
  hostStyle.visibility === 'hidden'

/**
 * Checks if the native chat is expanded (visible in the sidebar).
 * This is determined by YouTube's `live-chat-present-and-expanded` attribute.
 *
 * @returns true if the chat panel is expanded and visible
 */
export const isNativeChatExpanded = () => {
  const watchFlexy = document.querySelector('ytd-watch-flexy')
  const watchGrid = document.querySelector('ytd-watch-grid')
  const hasExpandedChat =
    watchFlexy?.hasAttribute('live-chat-present-and-expanded') || watchGrid?.hasAttribute('live-chat-present-and-expanded')
  const { chatContainer, chatFrameHost } = getNativeChatElements()
  const isHidden = isChatHiddenByAttribute(chatContainer, chatFrameHost)
  const hasChatDom = Boolean(chatContainer && chatFrameHost)
  return Boolean(hasExpandedChat && hasChatDom && !isHidden)
}

/**
 * Checks if the native chat is fully usable (visible, interactive, and properly sized).
 *
 * This performs comprehensive checks:
 * - All required DOM elements exist
 * - Elements are not hidden by CSS (display/visibility)
 * - Pointer events are not blocked
 * - Elements have sufficient size to be functional
 *
 * @returns true if the native chat can be interacted with
 */
export const isNativeChatUsable = () => {
  const { secondary, chatContainer, chatFrameHost, chatFrame } = getNativeChatElements()
  if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

  const secondaryStyle = window.getComputedStyle(secondary)
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)

  if (isChatHiddenByStyle(containerStyle, hostStyle)) return false
  if (secondaryStyle.display === 'none' || secondaryStyle.visibility === 'hidden') return false

  const pointerBlocked =
    secondaryStyle.pointerEvents === 'none' || containerStyle.pointerEvents === 'none' || hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return (
    secondaryBox.width > MIN_USABLE_WIDTH &&
    chatBox.width > MIN_USABLE_WIDTH &&
    chatBox.height > MIN_USABLE_HEIGHT &&
    frameBox.height > MIN_USABLE_HEIGHT
  )
}

/**
 * Checks if the native chat is open (not collapsed/hidden).
 *
 * Unlike `isNativeChatUsable`, this only checks visibility, not interactivity.
 * A chat can be "open" but not "usable" (e.g., during fullscreen mode where
 * the sidebar is hidden but the iframe still exists).
 *
 * @returns true if the chat iframe is loaded and not hidden
 */
export const isNativeChatOpen = () => {
  const { chatContainer, chatFrameHost } = getNativeChatElements()
  const chatFrame =
    (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
    (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)

  if (chatContainer && chatFrameHost) {
    const isHiddenAttr = isChatHiddenByAttribute(chatContainer, chatFrameHost)
    const containerStyle = window.getComputedStyle(chatContainer)
    const hostStyle = window.getComputedStyle(chatFrameHost)
    const isHiddenStyle = isChatHiddenByStyle(containerStyle, hostStyle)
    if (!isHiddenAttr && !isHiddenStyle) return true
  }

  if (!chatFrame) return false
  const doc = chatFrame.contentDocument ?? null
  const href = doc?.location?.href ?? chatFrame.getAttribute('src') ?? ''
  if (!href || href.includes('about:blank')) return false
  return true
}
