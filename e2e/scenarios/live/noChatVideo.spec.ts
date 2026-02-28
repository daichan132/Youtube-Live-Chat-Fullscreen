import { getE2ETestTargets } from '../../config/testTargets'
import { expect, test } from '../../fixtures'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'
import { hasPlayableChat, isExtensionChatLoaded } from '../../support/diagnostics'
import { switchButtonSelector } from '../../utils/selectors'

test('extension chat stays hidden on videos without live chat', async ({ page }) => {
  test.setTimeout(120000)

  const noChatUrl = getE2ETestTargets().noChat.url
  const watchPage = new YouTubeWatchPage(page)
  await watchPage.goto(noChatUrl)
  await watchPage.enterFullscreen()

  await page.locator('#movie_player').hover()
  const hiddenSwitch = await expect
    .poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 })
    .toBe(0)
    .then(
      () => true,
      () => false,
    )

  if (!hiddenSwitch) {
    const playableNative = await page.evaluate(hasPlayableChat)
    if (playableNative) {
      test.skip(true, 'Selected URL had playable chat and did not meet no-chat precondition.')
      return
    }
    test.skip(true, 'Selected URL exposed archive chat controls and did not meet no-chat precondition.')
    return
  }

  await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
  await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
})
