import { describe, expect, it } from 'vitest'
import { CHAT_PANEL_LAYER, CONTENT_UI_LAYER } from './zIndex'

describe('z-index layer scales', () => {
  it('keeps fullscreen overlay surfaces in explicit elevation order', () => {
    expect(CONTENT_UI_LAYER.overlay).toBeLessThan(CONTENT_UI_LAYER.modal)
    expect(CONTENT_UI_LAYER.modal).toBeLessThan(CONTENT_UI_LAYER.nestedModal)
  })

  it('keeps chat panel interaction surfaces above the iframe', () => {
    expect(CHAT_PANEL_LAYER.iframe).toBeLessThan(CHAT_PANEL_LAYER.hoverBridge)
    expect(CHAT_PANEL_LAYER.hoverBridge).toBeLessThan(CHAT_PANEL_LAYER.controls)
    expect(CHAT_PANEL_LAYER.controls).toBeLessThan(CHAT_PANEL_LAYER.interactionOverlay)
    expect(CHAT_PANEL_LAYER.interactionOverlay).toBeLessThan(CHAT_PANEL_LAYER.dragShield)
  })
})
