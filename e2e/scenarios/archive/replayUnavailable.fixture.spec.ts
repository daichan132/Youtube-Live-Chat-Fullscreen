import { expect, test } from '@e2e/fixtures'
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
