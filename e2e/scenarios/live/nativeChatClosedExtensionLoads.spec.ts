import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat } from '@e2e/support/diagnostics'
import { closeNativeChat } from '@e2e/utils/nativeChat'

test.describe('native chat closed extension loads', { tag: '@live' }, () => {
  test('extension chat loads when native chat is closed', async ({ page, liveUrl }) => {
    test.setTimeout(140000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with playable chat found from configured targets/search.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.goto(liveUrl)

    await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

    await expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(true)
    let playable = false
    try {
      await expect.poll(async () => page.evaluate(hasPlayableChat), { timeout: 20000 }).toBe(true)
      playable = true
    } catch {
      playable = false
    }
    if (!playable) {
      test.skip(true, 'Selected live video did not have playable chat.')
    }
    await page.waitForTimeout(1500)
    const closed = await closeNativeChat(page)
    if (!closed) {
      test.skip(true, 'Could not close native chat via UI controls.')
    }
    await expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(false)

    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const overlayReady = await overlay.waitForChatLoaded()
    expect(overlayReady).toBe(true)
  })
})
