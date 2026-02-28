/** Timing constants for waitForTimeout calls — avoids magic numbers in specs / helpers */
export const TIMING = {
  /** Delay after seek for video position to stabilise */
  SEEK_STABILIZE_MS: 2000,
  /** Polling interval while waiting for ads to finish */
  AD_CHECK_POLL_INTERVAL_MS: 1000,
  /** Pause after hover so CSS animations complete on overlay */
  OVERLAY_HOVER_ANIMATION_MS: 300,
  /** Delay before retrying YouTube consent dismissal */
  CONSENT_RETRY_DELAY_MS: 1500,
  /** Wait for drag-icon transition animation to settle */
  DRAG_ICON_TRANSITION_MS: 260,
  /** Wait for native chat DOM to settle after page load */
  NATIVE_CHAT_SETTLE_MS: 1500,
  /** Polling interval while opening archive chat panel */
  ARCHIVE_CHAT_OPEN_INTERVAL_MS: 800,
} as const

export const TIMEOUT = {
  SWITCH_VISIBLE: 10_000,
  SWITCH_ATTRIBUTE: 10_000,
  EXTENSION_CHAT: 20_000,
  ARCHIVE_CHAT: 60_000,
  FULLSCREEN: 8_000,
  NATIVE_CHAT_FRAME: 20_000,
  PAGE_GOTO: 45_000,
} as const
