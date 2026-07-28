import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const firstState = {
  video: { id: 'ylc-spa-live-a', title: 'SPA live fixture A', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

const secondState = {
  video: { id: 'ylc-spa-live-b', title: 'SPA live fixture B', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
} satisfies YouTubeScenarioState

test.describe('SPA navigation and DOM regeneration', { tag: '@live' }, () => {
  test('rebuilds the runtime against the current player without retaining a stale overlay', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(firstState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-spa-live-a')

    await scenario.spaNavigate(secondState)

    await expect
      .poll(() => scenario.observeDocument())
      .toEqual({
        url: 'https://www.youtube.com/watch?v=ylc-spa-live-b',
        title: 'SPA live fixture B',
        videoId: 'ylc-spa-live-b',
        playerVideoId: 'ylc-spa-live-b',
        generation: 1,
        fullscreen: false,
      })
    await expect
      .poll(() => scenario.observeRuntime())
      .toMatchObject({
        shadowHostCount: 0,
        extensionOverlayRendered: false,
        extensionChatLoaded: false,
      })

    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-spa-live-b')
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
