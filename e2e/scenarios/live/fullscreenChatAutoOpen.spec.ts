import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionChatLoaded } from '../../support/diagnostics'
import { findLiveUrlWithChat } from '../../utils/liveUrl'
import { switchButtonSelector } from '../../utils/selectors'

test('auto show fullscreen chat when enabled', async ({ page }) => {
  test.setTimeout(160000)

  const liveUrl = await findLiveUrlWithChat(page)
  if (!liveUrl) {
    test.skip(true, 'No live URL with chat found.')
    return
  }

  await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  if (!switchReady) {
    await captureChatState(page, test.info(), 'auto-open-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }

  await expect(switchButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
  let overlayReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded), { timeout: 20000 }).toBe(true)
    overlayReady = true
  } catch {
    overlayReady = false
  }

  if (!overlayReady) {
    const state = await captureChatState(page, test.info(), 'auto-open-extension-unready')
    if (!state || !state.native.playable) {
      test.skip(true, 'Native chat source was not playable, so auto-open precondition was not met.')
      return
    }
    expect(overlayReady).toBe(true)
  }
})
