/** Layers that compete inside the fullscreen overlay shadow root. */
export const CONTENT_UI_LAYER = {
  overlay: 1000,
  modal: 1100,
  nestedModal: 1200,
} as const

/** Layers local to one draggable chat panel. */
export const CHAT_PANEL_LAYER = {
  iframe: 1,
  hoverBridge: 10,
  controls: 20,
  interactionOverlay: 30,
  dragShield: 40,
} as const
