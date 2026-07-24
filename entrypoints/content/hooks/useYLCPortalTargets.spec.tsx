import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHADOW_HOST_ID, SWITCH_BUTTON_CONTAINER_ID } from '@/entrypoints/content/constants/domIds'
import { useYLCPortalTargets } from './useYLCPortalTargets'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    },
  },
}))

const createPlayer = ({ withControls = true } = {}) => {
  const player = document.createElement('div')
  player.id = 'movie_player'
  if (withControls) {
    const controls = document.createElement('div')
    controls.className = 'ytp-right-controls'
    player.appendChild(controls)
  }
  document.body.appendChild(player)
  return player
}

describe('useYLCPortalTargets', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps retrying when the player appears after the old five second limit', () => {
    const { result } = renderHook(() =>
      useYLCPortalTargets({
        overlayEnabled: true,
        switchEnabled: false,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(5500)
      createPlayer({ withControls: false })
      vi.advanceTimersByTime(250)
    })

    expect(result.current.overlayRoot?.host.parentElement).toBe(document.getElementById('movie_player'))
    expect(document.getElementById(SHADOW_HOST_ID)).not.toBeNull()
  })

  it('reattaches both targets when YouTube replaces the player', () => {
    const firstPlayer = createPlayer()
    const { result } = renderHook(() =>
      useYLCPortalTargets({
        overlayEnabled: true,
        switchEnabled: true,
      }),
    )
    const firstRoot = result.current.overlayRoot
    const firstSwitch = result.current.switchContainer

    act(() => {
      firstPlayer.remove()
      const replacement = createPlayer()
      document.dispatchEvent(new Event('yt-navigate-finish'))
      vi.runOnlyPendingTimers()
      expect(replacement.isConnected).toBe(true)
    })

    const replacement = document.getElementById('movie_player')
    expect(result.current.overlayRoot).not.toBe(firstRoot)
    expect(result.current.overlayRoot?.host.parentElement).toBe(replacement)
    expect(result.current.switchContainer).not.toBe(firstSwitch)
    expect(result.current.switchContainer?.parentElement).toBe(replacement?.querySelector('.ytp-right-controls'))
    expect(firstRoot?.host.isConnected).toBe(false)
    expect(firstSwitch?.isConnected).toBe(false)
  })

  it('resolves the overlay even when right controls are missing', () => {
    createPlayer({ withControls: false })

    const { result } = renderHook(() =>
      useYLCPortalTargets({
        overlayEnabled: true,
        switchEnabled: true,
      }),
    )

    expect(result.current.overlayRoot).not.toBeNull()
    expect(result.current.switchContainer).toBeNull()
  })

  it('removes extension-owned targets on unmount', () => {
    createPlayer()
    const { unmount } = renderHook(() =>
      useYLCPortalTargets({
        overlayEnabled: true,
        switchEnabled: true,
      }),
    )

    expect(document.getElementById(SHADOW_HOST_ID)).not.toBeNull()
    expect(document.getElementById(SWITCH_BUTTON_CONTAINER_ID)).not.toBeNull()

    unmount()

    expect(document.getElementById(SHADOW_HOST_ID)).toBeNull()
    expect(document.getElementById(SWITCH_BUTTON_CONTAINER_ID)).toBeNull()
  })
})
