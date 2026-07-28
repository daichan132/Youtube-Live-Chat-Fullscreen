import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const VIDEO_ID = 'ylc-live-handoff-fixture'
const scenarioState = {
  video: { id: VIDEO_ID, title: 'Live managed to native handoff fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

test.describe('live managed to native handoff', { tag: '@live' }, () => {
  test('promotes the managed iframe to the native iframe exactly once', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()

    expect(await overlay.waitForSwitchReady({ timeout: 12000 })).toBe(true)
    expect(await overlay.waitForChatLoaded({ timeout: 12000 })).toBe(true)
    const expectCompositedOverlayHost = async () => {
      await expect
        .poll(() => overlay.getHostCompositingState())
        .toMatchObject({
          matchesPlayer: true,
          zIndex: '1000',
          isolation: 'isolate',
          pointerEvents: 'none',
        })
      const state = await overlay.getHostCompositingState()
      expect(state.width).toBeGreaterThan(0)
      expect(state.height).toBeGreaterThan(0)
      expect(state.transform).not.toBe('none')
    }

    await expectCompositedOverlayHost()
    await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ owned: 'true', source: 'live_direct' })

    await scenario.addNativeIframe({ mode: 'live', state: 'playable' })

    await expect.poll(() => scenario.observeExtensionIframeIdentity()).toMatchObject({ id: 'chatframe', owned: null, managedCount: 0 })

    await overlay.toggleOff()
    expect(await overlay.waitForChatDetached({ timeout: 12000 })).toBe(true)
    await expectCompositedOverlayHost()
    await overlay.toggleOn()
    expect(await overlay.waitForChatLoaded({ timeout: 12000 })).toBe(true)
    await expectCompositedOverlayHost()
  })
})
