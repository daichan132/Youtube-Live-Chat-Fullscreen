import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { readContentStatusViaPopup } from '@e2e/utils/popupHelpers'

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
    await expect
      .poll(() => scenario.observeRuntime())
      .toMatchObject({
        nativeUnavailable: true,
        extensionOverlayRendered: false,
        extensionChatLoaded: false,
      })
  })

  test('extension chat stays hidden after the runtime confirms replay is unavailable', async ({ page, extension }) => {
    test.setTimeout(120000)

    const scenario = new YouTubeScenario(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()

    const popup = await page.context().newPage()
    try {
      await popup.goto(extension.url('popup.html'))
      await page.bringToFront()
      await expect
        .poll(() => readContentStatusViaPopup(popup), { timeout: 12000 })
        .toMatchObject({
          status: 'running',
          report: { page: { mode: 'no-chat', fullscreen: true }, runtime: { status: 'unavailable' } },
        })
      await expect
        .poll(() => scenario.observeRuntime())
        .toMatchObject({
          shadowHostCount: 0,
          switchContainerCount: 0,
          switchCount: 0,
          nativeUnavailable: true,
          nativePlayable: false,
          extensionOverlayRendered: false,
          extensionChatLoaded: false,
        })
    } finally {
      await popup.close()
      await page.bringToFront()
    }
  })
})
