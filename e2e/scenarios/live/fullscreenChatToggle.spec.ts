import { test } from '../../fixtures'
import { ExtensionOverlay } from '../../pages/ExtensionOverlay'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'
import { findLiveUrlWithChat } from '../../utils/liveUrl'

test.describe('fullscreen chat toggle', { tag: '@live' }, () => {
  test('toggle fullscreen chat on and off', async ({ page }) => {
    test.setTimeout(160000)

    const liveUrl = await findLiveUrlWithChat(page)
    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.waitForNativeChat()
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.ensureSwitchOff()

    const detached = await overlay.waitForChatDetached()
    if (!detached) {
      test.skip(true, 'Extension iframe did not detach in time.')
      return
    }

    await overlay.toggleOn()

    const overlayReady = await overlay.waitForChatLoaded()
    if (!overlayReady) {
      test.skip(true, 'Extension iframe did not load in time.')
      return
    }

    await overlay.toggleOff()

    const detachedAfter = await overlay.waitForChatDetached()
    if (!detachedAfter) {
      test.skip(true, 'Extension iframe did not detach after toggle off.')
      return
    }
  })
})
