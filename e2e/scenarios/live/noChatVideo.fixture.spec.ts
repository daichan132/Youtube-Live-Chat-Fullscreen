import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasNativeChatControls, hasPlayableChat, isExtensionChatLoaded, isExtensionOverlayRendered } from '@e2e/support/diagnostics'
import { buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'

const VIDEO_ID = 'ylc-no-chat-fixture'
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

const watchFixtureHtml = buildWatchFixtureHtml({
  title: 'No chat fixture',
  videoId: VIDEO_ID,
  extraBody: '<div id="chat-container"></div>',
})

test.describe('no chat video fixture', { tag: ['@live', '@fixture'] }, () => {
  test('extension chat stays hidden', async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, VIDEO_ID, watchFixtureHtml)

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(WATCH_URL)
    await watchPage.enterFullscreen()

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)

    expect(await page.evaluate(hasNativeChatControls, switchButtonContainerSelector)).toBe(false)

    await page.evaluate(() => {
      const chatContainer = document.getElementById('chat-container')
      const showHideButton = document.createElement('div')
      showHideButton.id = 'show-hide-button'
      const button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('aria-label', 'Show chat')
      showHideButton.append(button)
      chatContainer?.append(showHideButton)
    })

    expect(await page.evaluate(hasNativeChatControls, switchButtonContainerSelector)).toBe(true)
  })
})
