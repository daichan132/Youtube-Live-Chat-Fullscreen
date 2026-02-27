import { expect, test } from '../../fixtures'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'
import { TIMEOUT } from '../../support/constants'
import { captureChatState } from '../../support/diagnostics'
import { selectReplayUnavailableUrl } from '../../support/urls/archiveReplay'
import { SHADOW_HOST, switchButtonSelector } from '../../utils/selectors'

test.describe('archive replay unavailable', { tag: '@archive' }, () => {
  test('hide fullscreen chat button when replay chat is unavailable', async ({ page }) => {
    test.setTimeout(90000)

    const selectedUrl = await selectReplayUnavailableUrl(page, { maxDurationMs: 30000 })
    if (!selectedUrl) {
      await captureChatState(page, test.info(), 'replay-unavailable-precondition-missing')
      test.skip(true, 'No replay-unavailable URL reached required native state.')
      return
    }

    const yt = new YouTubeWatchPage(page)

    try {
      await yt.enterFullscreen()
    } catch {
      await captureChatState(page, test.info(), 'replay-unavailable-fullscreen-failed')
      test.skip(true, 'Could not enter fullscreen within timeout.')
      return
    }

    const switchHidden = await expect
      .poll(async () => page.locator(switchButtonSelector).count(), { timeout: TIMEOUT.FULLSCREEN })
      .toBe(0)
      .then(
        () => true,
        () => false,
      )
    if (!switchHidden) {
      await captureChatState(page, test.info(), 'replay-unavailable-switch-visible')
    }
    expect(switchHidden).toBe(true)

    const shadowHostAppeared = await page.waitForSelector(SHADOW_HOST, { timeout: 7000 }).then(
      () => true,
      () => false,
    )
    expect(shadowHostAppeared).toBe(false)
  })
})
