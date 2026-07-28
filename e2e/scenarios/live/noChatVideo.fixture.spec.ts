import { expect, test } from '@e2e/fixtures'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'

const VIDEO_ID = 'ylc-no-chat-fixture'
const scenarioState = {
  video: { id: VIDEO_ID, title: 'No chat fixture', mode: 'ordinary' },
  page: { chatContainer: 'present' },
  fullscreen: false,
  chat: { mode: 'none' },
} satisfies YouTubeScenarioState

test.describe('no chat video fixture', { tag: ['@live', '@fixture'] }, () => {
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
        nativePlayable: false,
        nativeControls: false,
        extensionOverlayRendered: false,
        extensionChatLoaded: false,
      })

    await scenario.addNativeChatControl()
    await expect.poll(async () => (await scenario.observeRuntime()).nativeControls).toBe(true)
  })
})
