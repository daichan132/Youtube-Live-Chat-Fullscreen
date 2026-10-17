import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatRuntimeImpl } from './ChatRuntime'

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      getManifest: () => ({ version: '2.3.15' }),
    },
  },
}))

describe('ChatRuntime live-state mutation boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState({}, '', '/watch?v=current-video')
  })

  afterEach(() => {
    Reflect.deleteProperty(document, 'fullscreenElement')
    document.body.replaceChildren()
    vi.useRealTimers()
  })

  it.each([
    { boundary: 'ytp-time-display', active: 'ytp-live' },
    { boundary: 'ytp-live-badge', active: 'ytp-live-badge-is-livehead' },
  ])('updates the player switch when the $boundary live class disappears and returns', async ({ boundary, active }) => {
    const player = document.createElement('div')
    player.id = 'movie_player'
    player.innerHTML = '<div class="ytp-right-controls"></div>'
    const indicator = document.createElement('div')
    indicator.classList.add(boundary, active)
    player.append(indicator)
    document.body.append(player)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => player })
    const runtime = new ChatRuntimeImpl()

    runtime.start()
    try {
      // Keep chat disabled so no managed iframe or retry can provide another
      // wake-up signal. Only the real observer sees the live class changes.
      await vi.advanceTimersByTimeAsync(40)
      expect(runtime.getSnapshot().showSwitch).toBe(true)
      expect(runtime.getSnapshot().switchContainer?.isConnected).toBe(true)
      expect(runtime.getDiagnosticReport().page.mode).toBe('live')

      indicator.classList.remove(active)
      await vi.advanceTimersByTimeAsync(40)

      expect(runtime.getSnapshot().showSwitch).toBe(false)
      expect(runtime.getSnapshot().switchContainer).toBeNull()
      expect(runtime.getDiagnosticReport().page.mode).toBe('unknown')

      indicator.classList.add(active)
      await vi.advanceTimersByTimeAsync(40)

      expect(runtime.getSnapshot().showSwitch).toBe(true)
      expect(runtime.getSnapshot().switchContainer?.isConnected).toBe(true)
      expect(runtime.getDiagnosticReport().page.mode).toBe('live')
    } finally {
      runtime.stop()
    }
  })
})
