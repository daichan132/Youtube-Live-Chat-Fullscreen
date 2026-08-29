import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const createLiveState = (suffix: string): YouTubeScenarioState => ({
  video: { id: `ylc-spa-live-${suffix}`, title: `SPA live fixture ${suffix.toUpperCase()}`, mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
})

const firstState = createLiveState('a')
const secondState = createLiveState('b')

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

  test('does not accumulate roots or controls across repeated watch navigations', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(180000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    const states = [createLiveState('repeat-a'), createLiveState('repeat-b'), createLiveState('repeat-c'), createLiveState('repeat-d')] as const

    await scenario.load(states[0])

    for (const [index, state] of states.entries()) {
      if (index > 0) {
        await scenario.spaNavigate(state)
        await expect
          .poll(() => scenario.observeRuntime())
          .toMatchObject({
            shadowHostCount: 0,
            switchContainerCount: 0,
            switchCount: 0,
            extensionOverlayRendered: false,
            extensionChatLoaded: false,
          })
      }

      await scenario.enterFullscreen()
      await overlay.expectSwitchReady({ timeout: 12000 })
      await overlay.expectChatLoaded({ timeout: 12000 })
      await expect.poll(() => scenario.observeExtensionIframeHref()).toContain(`v=${state.video.id}`)
      await expect
        .poll(() => scenario.observeRuntime())
        .toMatchObject({
          shadowHostCount: 1,
          switchContainerCount: 1,
          switchCount: 1,
          extensionOverlayRendered: true,
          extensionChatLoaded: true,
        })
    }
  })
})
