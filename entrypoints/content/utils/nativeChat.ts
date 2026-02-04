import { SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'

const nativeChatTriggerSelectors =
  '#chat-container, ytd-live-chat-frame, ytd-live-chat-frame #show-hide-button, ytd-live-chat-frame #close-button, #show-hide-button, #close-button'

export const isNativeChatToggleButton = (element: HTMLElement) => {
  const button = element.closest('button')
  if (!button) return false
  if (button.closest(`#${SWITCH_BUTTON_CONTAINER_ID}`)) return false

  const label = `${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('title') ?? ''} ${
    button.getAttribute('data-title-no-tooltip') ?? ''
  } ${button.getAttribute('data-tooltip-text') ?? ''}`.toLowerCase()
  const isChatLabel = label.includes('chat') || label.includes('チャット')
  if (!isChatLabel) return false

  const isPlayerControls = Boolean(button.closest('.ytp-right-controls'))
  const isToggleViewModel = Boolean(button.closest('toggle-button-view-model, button-view-model'))
  return isPlayerControls || isToggleViewModel
}

export const isNativeChatTriggerTarget = (target: HTMLElement) => Boolean(target.closest(nativeChatTriggerSelectors))
