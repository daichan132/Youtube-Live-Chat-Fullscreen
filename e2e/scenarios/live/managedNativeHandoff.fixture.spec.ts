import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'

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
  test('promotes the managed iframe once and preserves readable customized chat without another toggle', { tag: '@fixture' }, async ({
    page,
    extension,
  }) => {
    test.setTimeout(120000)

    expect(await patchOverlayStore(extension, { profile: { appearance: { fontSize: 23 } } })).not.toBeNull()
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    const expectCustomizedChatReady = async () => {
      await overlay.expectChatLoaded({ timeout: 12000 })
      await overlay.installChatTypographyProbe()
      await expect.poll(() => overlay.getChatTypographyState()).toMatchObject({ renderedFontSize: '23px' })
    }
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()

    await overlay.expectSwitchReady({ timeout: 12000 })
    await expectCustomizedChatReady()
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
    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toEqual({
        id: null,
        owned: 'true',
        source: 'live_direct',
        managedCount: 1,
        nativeCount: 0,
      })

    await scenario.addNativeIframe({ mode: 'live', state: 'playable' })

    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toEqual({
        id: 'chatframe',
        owned: null,
        source: null,
        managedCount: 0,
        nativeCount: 0,
      })
    await expectCustomizedChatReady()

    await overlay.toggleOff()
    await overlay.expectChatDetached({ timeout: 12000 })
    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toEqual({
        id: null,
        owned: null,
        source: null,
        managedCount: 0,
        nativeCount: 1,
      })
    await overlay.expectOverlayRemoved({ timeout: 12000 })
    await overlay.expectSwitchReady({ timeout: 12000 })

    await overlay.toggleOn()
    await expectCustomizedChatReady()
    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toEqual({
        id: 'chatframe',
        owned: null,
        source: null,
        managedCount: 0,
        nativeCount: 0,
      })
    await expectCompositedOverlayHost()
  })

  test('releases managed live chat and borrows replay when the stream ends without a URL change', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toMatchObject({
        owned: 'true',
        source: 'live_direct',
        managedCount: 1,
      })
    const liveUrl = page.url()

    await scenario.endLiveAsArchive()

    await overlay.expectArchiveChatPlayable({ timeout: 12000 })
    await expect
      .poll(() => scenario.observeExtensionIframeIdentity())
      .toEqual({
        id: 'chatframe',
        owned: null,
        source: null,
        managedCount: 0,
        nativeCount: 0,
      })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain(`/live_chat_replay?v=${VIDEO_ID}`)
    expect(page.url()).toBe(liveUrl)
  })
})
