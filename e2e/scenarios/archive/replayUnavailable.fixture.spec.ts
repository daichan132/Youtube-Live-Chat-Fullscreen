import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const VIDEO_ID = 'ylc-replay-unavailable-fixture'
const scenarioState = {
  video: { id: VIDEO_ID, title: 'Replay unavailable fixture', mode: 'archive' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: {
    mode: 'archive',
    native: { state: 'unavailable', showHideControl: true, hostVideoId: false },
    response: 'unavailable',
  },
} satisfies YouTubeScenarioState

test.describe('replay unavailable archive fixture', { tag: ['@archive', '@fixture'] }, () => {
  test('rechecks a loaded replay on a page-data signal without a top-document mutation', async ({ page }) => {
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load({
      ...scenarioState,
      chat: { mode: 'archive', native: { state: 'playable', showHideControl: true }, response: 'playable' },
    })
    await scenario.enterFullscreen()
    await overlay.expectArchiveChatPlayable({ timeout: 12000 })

    await scenario.invalidateLoadedChat()

    await overlay.expectOverlayRemoved({ timeout: 12000 })
    await expect.poll(() => scenario.nativeIframeCount()).toBe(1)
    await expect.poll(() => scenario.observeRuntime()).toMatchObject({
      nativeUnavailable: true,
      extensionOverlayRendered: false,
      extensionChatLoaded: false,
    })
  })

  test('extension chat stays hidden', async ({ page }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()

    await expect
      .poll(() => scenario.observeRuntime(), { timeout: 12000 })
      .toMatchObject({
        shadowHostCount: 0,
        switchContainerCount: 0,
        switchCount: 0,
        nativeUnavailable: true,
        nativePlayable: false,
        extensionOverlayRendered: false,
        extensionChatLoaded: false,
      })
  })
})
