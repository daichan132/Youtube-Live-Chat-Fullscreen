import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

/**
 * Checks if the page has chat functionality (live chat frame or container).
 * Used for language-independent chat toggle detection.
 */
const hasChatOnPage = () => Boolean(document.querySelector('ytd-live-chat-frame') || document.querySelector('#chat-container'))

const getButtonLabelText = (button: HTMLButtonElement) =>
  `${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('title') ?? ''} ${
    button.getAttribute('data-title-no-tooltip') ?? ''
  } ${button.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()

const isChatLabel = (label: string) => label.includes('chat') || label.includes('チャット')

/**
 * Detects if an element is a native YouTube chat toggle button.
 *
 * Uses a conservative approach to avoid false positives:
 * 1. Must be a button in player controls area
 * 2. Page must have chat functionality
 * 3. Must match known chat toggle selectors or chat-related label text
 */
export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false

  // Exclude our extension's button
  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false

  // Page must have chat functionality for this to be a chat toggle
  if (!hasChatOnPage()) return false

  const isSidebarToggle = Boolean(button.closest('ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button'))
  if (isSidebarToggle) return true

  // Must be in player controls area for label-based matching
  const isPlayerControls = Boolean(button.closest('.ytp-right-controls'))
  if (!isPlayerControls) return false

  if (button.closest('#show-hide-button, #close-button')) return true

  const label = getButtonLabelText(button)
  return isChatLabel(label)
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
