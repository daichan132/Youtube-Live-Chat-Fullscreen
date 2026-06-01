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
})

test.describe('no chat video', { tag: '@live' }, () => {
  test('extension chat stays hidden on a deterministic no-chat fixture', async ({ page }) => {
    test.setTimeout(120000)

    await routeYouTubeWatchFixture(page, NO_CHAT_VIDEO_ID, noChatFixtureHtml)

    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(NO_CHAT_FIXTURE_URL)
    await watchPage.enterFullscreen()

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
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

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(1)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(1)

    await page.locator('#movie_player').hover()
    const playableNative = await page.evaluate(hasPlayableChat)
    if (playableNative) {
      test.skip(true, 'Selected URL had playable chat and did not meet no-chat precondition.')
    }

    const hiddenSwitch = await expect
      .poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 })
      .toBe(0)
      .then(
        () => true,
        () => false,
      )
    if (!hiddenSwitch) {
      const hasNativeControls = await page.evaluate(hasNativeChatControls, switchButtonContainerSelector)
      if (hasNativeControls) {
        test.skip(true, 'Selected URL exposed native chat controls and did not meet no-chat precondition.')
        return
      }
      expect(await page.locator(switchButtonSelector).count()).toBe(0)
    }
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })
})
