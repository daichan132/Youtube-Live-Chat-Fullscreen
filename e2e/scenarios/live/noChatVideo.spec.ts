import { getE2ETestTargets } from '@e2e/config/testTargets'
import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasNativeChatControls, hasPlayableChat, hasYouTubePlayerError, isExtensionChatLoaded, isExtensionOverlayRendered } from '@e2e/support/diagnostics'
import { buildWatchFixtureHtml, routeYouTubeWatchFixture } from '@e2e/support/youtubeFixture'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'

const NO_CHAT_FIXTURE_URL = 'https://www.youtube.com/watch?v=ylc-no-chat-fixture'
const NO_CHAT_VIDEO_ID = 'ylc-no-chat-fixture'

const noChatFixtureHtml = buildWatchFixtureHtml({
  title: 'No chat fixture',
  videoId: NO_CHAT_VIDEO_ID,
  extraBody: '<div id="chat-container"></div>',
})

test.describe('no chat video', { tag: '@live' }, () => {
  test('extension chat stays hidden on a deterministic no-chat fixture', { tag: '@fixture' }, async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, NO_CHAT_VIDEO_ID, noChatFixtureHtml)

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(NO_CHAT_FIXTURE_URL)
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

  test('extension chat stays hidden on a configured no-chat video', async ({ page }) => {
    test.setTimeout(120000)

    const noChatUrl = getE2ETestTargets().noChat.url
    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(noChatUrl)
    if (await page.evaluate(hasYouTubePlayerError)) {
      test.skip(true, 'Selected no-chat URL showed a YouTube player error and did not meet test preconditions.')
    }
    await watchPage.enterFullscreen()

    await page.locator('#movie_player').hover()
    const playableNative = await page.evaluate(hasPlayableChat)
    if (playableNative) {
      test.skip(true, 'Selected URL had playable chat and did not meet no-chat precondition.')
    }

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })
})
