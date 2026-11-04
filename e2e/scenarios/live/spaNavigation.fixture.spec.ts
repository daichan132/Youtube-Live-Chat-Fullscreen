import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { readContentStatusViaPopup } from '@e2e/utils/popupHelpers'

const expectCurrentChatTarget = async (scenario: YouTubeScenario, videoId: string) => {
  await expect
    .poll(async () => {
      const href = await scenario.observeExtensionIframeHref()
      if (!href) return null
      const url = new URL(href)
      return { origin: url.origin, pathname: url.pathname, videoId: url.searchParams.get('v') }
    })
    .toEqual({ origin: 'https://www.youtube.com', pathname: '/live_chat', videoId })
}

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
  test('keeps the session after a cancelled navigation and follows committed history changes', { tag: '@fixture' }, async ({ page, extension }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(firstState)
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    const watchUrl = page.url()
    const popup = await page.context().newPage()
    try {
      await popup.goto(extension.url('popup.html'))
      await page.bringToFront()
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'running' })

      expect(await scenario.cancelNextHistoryNavigation('/results?search_query=cancelled')).toEqual({
        before: watchUrl,
        after: watchUrl,
        cancelled: true,
      })
      expect(await readContentStatusViaPopup(popup)).toMatchObject({ status: 'running' })
      await overlay.expectChatLoaded({ timeout: 12000 })

      await scenario.pushHistoryLocation('/results?search_query=cancelled')
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'unsupported' })
      await overlay.expectOverlayRemoved({ timeout: 12000 })

      await scenario.goBackHistory()
      await expect.poll(() => page.url()).toBe(watchUrl)
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'running' })
      await overlay.expectChatLoaded({ timeout: 12000 })
      const restored = await readContentStatusViaPopup(popup)
      if (!restored) throw new Error('Expected the active content status.')

      await scenario.pushHistoryLocation(`${watchUrl}#chapter`)
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'running', token: restored.token })
      await scenario.replaceHistoryLocation(`${watchUrl}#updated`)
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'running', token: restored.token })
      await scenario.goBackHistory()
      await expect.poll(() => page.url()).toBe(watchUrl)
      await expect.poll(() => readContentStatusViaPopup(popup)).toMatchObject({ status: 'running', token: restored.token })
      await overlay.expectChatLoaded({ timeout: 12000 })
    } finally {
      await popup.close()
      await page.bringToFront()
    }
  })

  test('rebuilds the runtime against the current player without retaining a stale overlay', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(firstState)
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expectCurrentChatTarget(scenario, 'ylc-spa-live-a')
    await expect(page.frameLocator('iframe[data-ylc-chat]').locator('title')).toHaveJSProperty(
      'textContent',
      'SPA live fixture A chat fixture',
    )

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
    await expectCurrentChatTarget(scenario, 'ylc-spa-live-b')
    await expect(page.frameLocator('iframe[data-ylc-chat]').locator('title')).toHaveJSProperty(
      'textContent',
      'SPA live fixture B chat fixture',
    )
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
    const states = [
      createLiveState('repeat-a'),
      createLiveState('repeat-b'),
      createLiveState('repeat-c'),
      createLiveState('repeat-d'),
    ] as const

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
      await expectCurrentChatTarget(scenario, state.video.id)
      await expect(page.frameLocator('iframe[data-ylc-chat]').locator('title')).toHaveJSProperty(
        'textContent',
        `${state.video.title} chat fixture`,
      )
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
