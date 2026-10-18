import { SWITCH_BUTTON_CONTAINER_ID } from '../../entrypoints/content/constants/domIds'

export const switchButtonContainerSelector = `#${SWITCH_BUTTON_CONTAINER_ID}`
export const switchButtonSelector = `${switchButtonContainerSelector} button.ytp-button`

// Observe YouTube independently of the production selector catalog. A broken
// product selector must not turn an available canary source into a skip.
export const MOVIE_PLAYER = '#movie_player'
export const FULLSCREEN_BUTTON = 'button.ytp-fullscreen-button'
export const SHADOW_HOST = '#shadow-root-live-chat'
export const NATIVE_CHAT_FRAME = 'ytd-live-chat-frame'

export const ARCHIVE_SIDEBAR_OPEN_SELECTORS = [
  'ytd-live-chat-frame #show-hide-button button',
  'ytd-live-chat-frame #show-hide-button yt-icon-button',
  '#chat-container #show-hide-button button',
  '#chat-container #show-hide-button yt-icon-button',
  'ytd-live-chat-frame #show-hide-button',
  '#chat-container #show-hide-button',
] as const

export const ARCHIVE_PLAYER_CHAT_TOGGLE_SELECTORS = [
  '.ytp-right-controls toggle-button-view-model button[aria-pressed="false"]',
  '.ytp-right-controls button-view-model button[aria-pressed="false"]',
  '#movie_player toggle-button-view-model button[aria-pressed="false"]',
  '#movie_player button-view-model button[aria-pressed="false"]',
] as const
