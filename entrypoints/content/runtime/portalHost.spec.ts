import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { createPortalHost } from './portalHost'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
  },
}))

describe('portalHost', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('owns overlay and switch targets independently', () => {
    const player = document.createElement('div')
    const controls = document.createElement('div')
    document.body.append(player, controls)
    const host = createPortalHost()

    const initial = host.sync({
      player,
      rightControls: controls,
      overlayEnabled: true,
      switchEnabled: true,
    })
    expect(initial.overlayRoot?.host.id).toBe(SHADOW_HOST_ID)
    expect(initial.switchContainer?.id).toBe(SWITCH_BUTTON_CONTAINER_ID)

    const overlayOnly = host.sync({
      player,
      rightControls: controls,
      overlayEnabled: true,
      switchEnabled: false,
    })
    expect(overlayOnly.overlayRoot).toBe(initial.overlayRoot)
    expect(overlayOnly.switchContainer).toBeNull()
    expect(document.getElementById(SWITCH_BUTTON_CONTAINER_ID)).toBeNull()
  })

  it('recreates disconnected targets and clears every owned node', () => {
    const firstPlayer = document.createElement('div')
    const secondPlayer = document.createElement('div')
    const firstControls = document.createElement('div')
    const secondControls = document.createElement('div')
    document.body.append(firstPlayer, secondPlayer, firstControls, secondControls)
    const host = createPortalHost()

    const first = host.sync({
      player: firstPlayer,
      rightControls: firstControls,
      overlayEnabled: true,
      switchEnabled: true,
    })
    const second = host.sync({
      player: secondPlayer,
      rightControls: secondControls,
      overlayEnabled: true,
      switchEnabled: true,
    })

    expect(first.overlayRoot?.host.isConnected).toBe(false)
    expect(second.overlayRoot?.host.parentElement).toBe(secondPlayer)
    expect(second.switchContainer?.parentElement).toBe(secondControls)

    host.clear()
    expect(document.getElementById(SHADOW_HOST_ID)).toBeNull()
    expect(document.getElementById(SWITCH_BUTTON_CONTAINER_ID)).toBeNull()
  })
})
