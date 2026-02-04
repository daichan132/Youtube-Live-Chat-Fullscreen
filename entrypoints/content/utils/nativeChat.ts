import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

/**
 * Checks if the page has chat functionality (live chat frame or container).
 * Used for language-independent chat toggle detection.
 */
const hasChatOnPage = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

/**
 * Detects if an element is a native YouTube chat toggle button.
 *
 * Uses a language-independent structural approach:
 * 1. Must be a button in player controls area
 * 2. Must be a toggle-style button (toggle-button-view-model)
 * 3. Page must have chat functionality
 *
 * This avoids relying on localized button labels like "Chat", "チャット", etc.
 */
export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false

  // Exclude our extension's button
  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false

  // Must be in player controls area
  const isPlayerControls = Boolean(button.closest('.ytp-right-controls'))
  if (!isPlayerControls) return false

  // Must be a toggle-style button (YouTube uses these for chat toggle)
  const isToggleViewModel = Boolean(button.closest('toggle-button-view-model, button-view-model'))
  if (!isToggleViewModel) return false

  // Page must have chat functionality for this to be a chat toggle
  if (!hasChatOnPage()) return false

  return true
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
