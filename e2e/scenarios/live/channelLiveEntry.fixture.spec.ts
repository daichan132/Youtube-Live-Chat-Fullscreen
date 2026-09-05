import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const createLiveEntryState = (videoId: string, title: string, route: 'channel-live' | 'direct-live'): YouTubeScenarioState => ({
  video: { id: videoId, title, mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard', route },
  fullscreen: false,
  chat: {
    mode: 'live',
    native: { state: 'absent' },
    response: 'playable',
  },
})

const channelLiveState = createLiveEntryState('ylc-channel-live', 'Channel live fixture', 'channel-live')
const nextChannelLiveState = createLiveEntryState('ylc-channel-live-next', 'Next channel live fixture', 'channel-live')
const directLiveState = createLiveEntryState('ylc-direct-live', 'Direct live fixture', 'direct-live')

test.describe('live entry routes', { tag: '@live' }, () => {
  test('starts the content session and resolves the current channel player video', { tag: '@fixture' }, async ({ page }) => {
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

  test('replaces the active video while preserving the channel-live URL', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(channelLiveState)
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-channel-live')
    const channelUrl = page.url()

    await scenario.spaNavigate(nextChannelLiveState)

    expect(page.url()).toBe(channelUrl)
    await expect
      .poll(() => scenario.observeDocument())
      .toMatchObject({
        url: channelUrl,
        title: 'Next channel live fixture',
        videoId: 'ylc-channel-live-next',
        playerVideoId: 'ylc-channel-live-next',
        generation: 1,
        fullscreen: false,
      })
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-channel-live-next')
    await expect.poll(() => scenario.observeRuntime()).toMatchObject({
      shadowHostCount: 1,
      switchContainerCount: 1,
      switchCount: 1,
      extensionOverlayRendered: true,
      extensionChatLoaded: true,
    })
  })

  test('starts directly from a /live/<videoId> entry route', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(directLiveState)

    await expect
      .poll(() => scenario.observeDocument())
      .toMatchObject({
        url: 'https://www.youtube.com/live/ylc-direct-live',
        title: 'Direct live fixture',
        videoId: 'ylc-direct-live',
        playerVideoId: 'ylc-direct-live',
        fullscreen: false,
      })
    await scenario.enterFullscreen()
    await overlay.expectSwitchReady({ timeout: 12000 })
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect.poll(() => scenario.observeExtensionIframeHref()).toContain('v=ylc-direct-live')
  })
})
