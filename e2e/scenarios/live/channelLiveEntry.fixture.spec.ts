import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const channelLiveState: YouTubeScenarioState = {
  video: { id: 'ylc-channel-live', title: 'Channel live fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard', route: 'channel-live' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
}

test.describe('channel live entry route', { tag: '@live' }, () => {
  test('starts the content session and resolves the current player video', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(channelLiveState)

    await expect
      .poll(() => scenario.observeDocument())
      .toMatchObject({
        url: 'https://www.youtube.com/@ylc-fixture/live',
        title: 'Channel live fixture',
        videoId: 'ylc-channel-live',
        playerVideoId: 'ylc-channel-live',
        fullscreen: false,
      })

    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-channel-live')
    await expect
      .poll(() => scenario.observeRuntime())
      .toMatchObject({
        shadowHostCount: 1,
        switchContainerCount: 1,
        switchCount: 1,
        extensionOverlayRendered: true,
        extensionChatLoaded: true,
      })
  })
})
