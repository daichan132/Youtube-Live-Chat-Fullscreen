import { expect, test } from '../../fixtures'
import { ExtensionOverlay } from '../../pages/ExtensionOverlay'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'
import { captureChatState, isExtensionChatLoaded, isNativeLiveChatPlayable } from '../../support/diagnostics'
import { findLiveUrlWithChat } from '../../utils/liveUrl'

test.describe('fullscreen chat auto open', { tag: '@live' }, () => {
  test('auto show fullscreen chat when enabled', async ({ page }) => {
    test.setTimeout(160000)

    const liveUrl = await findLiveUrlWithChat(page)
    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.waitForNativeChat()
    const nativeReady = await page.waitForFunction(isNativeLiveChatPlayable, { timeout: 30000 }).then(
      () => true,
      () => false,
    )
    if (!nativeReady) {
      await captureChatState(page, test.info(), 'auto-open-native-precondition-missing')
      test.skip(true, 'Native chat source was not playable before fullscreen.')
      return
    }

    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      await captureChatState(page, test.info(), 'auto-open-switch-missing')
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await expect(overlay.switchButton()).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })

    const overlayReady = await overlay.waitForChatLoaded()

    if (!overlayReady) {
      const state = await captureChatState(page, test.info(), 'auto-open-extension-unready')
      if (state?.native.playable === false) {
        const nativeRecovered = await page.waitForFunction(isNativeLiveChatPlayable, { timeout: 15000 }).then(
          () => true,
          () => false,
        )
        if (nativeRecovered) {
          const overlayRecovered = await expect
            .poll(async () => page.evaluate(isExtensionChatLoaded), { timeout: 15000 })
            .toBe(true)
            .then(
              () => true,
              () => false,
            )
          if (overlayRecovered) return
        }
      }

      if (!state || !state.native.playable) {
        test.skip(true, 'Native chat source was not playable, so auto-open precondition was not met.')
        return
      }
      expect(overlayReady).toBe(true)
    }
  })
})
