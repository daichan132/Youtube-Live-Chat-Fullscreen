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
  interactionOverlay: 30,
  // Visible buttons and menus must win hit testing over transparent handles.
  controls: 35,
  dragShield: 40,
} as const
