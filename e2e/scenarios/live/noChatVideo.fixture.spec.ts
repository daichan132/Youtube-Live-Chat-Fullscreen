import { expect, test } from '@e2e/fixtures'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { readContentStatusViaPopup } from '@e2e/utils/popupHelpers'

const VIDEO_ID = 'ylc-no-chat-fixture'
const scenarioState = {
  video: { id: VIDEO_ID, title: 'No chat fixture', mode: 'ordinary' },
  page: { chatContainer: 'present' },
  fullscreen: false,
  chat: { mode: 'none' },
} satisfies YouTubeScenarioState

test.describe('no chat video fixture', { tag: ['@live', '@fixture'] }, () => {
  test('extension chat stays hidden after the runtime observes a page without a chat source', async ({ page, extension }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()

    const popup = await page.context().newPage()
    try {
      await popup.goto(extension.url('popup.html'))
      await page.bringToFront()
      // The isolated content script cannot read this fixture's main-world player API;
      // searching and exhausted searches both keep an unconfirmed chat source hidden.
      await expect
        .poll(() => readContentStatusViaPopup(popup), { timeout: 12000 })
        .toMatchObject({
          status: 'running',
          report: {
            page: { fullscreen: true },
            runtime: { status: expect.stringMatching(/^(searching|unavailable)$/) },
          },
        })
      await expect
        .poll(() => scenario.observeRuntime())
        .toMatchObject({
          shadowHostCount: 0,
          switchContainerCount: 0,
          switchCount: 0,
          nativePlayable: false,
          nativeControls: false,
          extensionOverlayRendered: false,
          extensionChatLoaded: false,
        })
    } finally {
      await popup.close()
      await page.bringToFront()
    }
  })
})
