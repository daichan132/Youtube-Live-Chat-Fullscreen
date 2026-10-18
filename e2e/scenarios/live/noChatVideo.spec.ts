import { getE2ETestTargets } from '@e2e/config/testTargets'
import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat, hasYouTubePlayerError, isExtensionChatLoaded, isExtensionOverlayRendered } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'
import { readContentStatusViaPopup } from '@e2e/utils/popupHelpers'
import { SHADOW_HOST, switchButtonContainerSelector, switchButtonSelector } from '@e2e/utils/selectors'

test.describe('no chat video', { tag: '@live' }, () => {
  test('extension chat stays hidden on a configured no-chat video', async ({ page, extension }) => {
    test.setTimeout(120000)

    const noChatUrl = getE2ETestTargets().noChat.url
    const watchPage = new YouTubeWatchPage(page)
    await watchPage.goto(noChatUrl)
    if (await page.evaluate(hasYouTubePlayerError)) {
      test.skip(true, 'Selected no-chat URL showed a YouTube player error and did not meet test preconditions.')
    }
    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => watchPage.enterFullscreen())
    if (!fullscreenReady) {
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await page.locator('#movie_player').hover()
    const playableNative = await page.evaluate(hasPlayableChat)
    if (playableNative) {
      test.skip(true, 'Selected URL had playable chat and did not meet no-chat precondition.')
    }

    const popup = await page.context().newPage()
    try {
      await popup.goto(extension.url('popup.html'))
      await page.bringToFront()
      // Missing UI alone also matches a content script that never started.
      // A missing or failed runtime response is an extension failure, not an
      // unavailable YouTube precondition, so it must remain outside skip guards.
      await expect
        .poll(() => readContentStatusViaPopup(popup), { timeout: 12000 })
        .toMatchObject({
          status: 'running',
          report: {
            page: {
              mode: expect.stringMatching(/^(no-chat|unknown)$/),
              fullscreen: true,
              capabilities: { canBorrowNativeChat: false, canCreateManagedLiveChat: false },
            },
            runtime: { status: expect.stringMatching(/^(searching|unavailable)$/) },
          },
        })
    } finally {
      await popup.close()
      await page.bringToFront()
    }

    await expect.poll(async () => page.locator(SHADOW_HOST).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonContainerSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 }).toBe(0)
    await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionOverlayRendered)).toBe(false)
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
  })
})
