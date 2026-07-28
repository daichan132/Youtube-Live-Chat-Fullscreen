import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState, isNativeLiveChatPlayable } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'

test.describe('fullscreen chat auto open', { tag: '@live' }, () => {
  test('auto show fullscreen chat when enabled', async ({ page, liveUrl }) => {
    test.setTimeout(160000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with chat found.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.goto(liveUrl)

    const nativeChatFrameReady = await meetsExternalYouTubePrecondition('native-chat-frame', () => yt.expectNativeChat())
    if (!nativeChatFrameReady) {
      test.skip(true, 'Live URL did not expose native chat frame in time.')
      return
    }
    const nativeReady = await meetsExternalYouTubePrecondition('native-chat-source', () =>
      page.waitForFunction(isNativeLiveChatPlayable, undefined, { timeout: 30000 }).then(() => {}),
    )
    if (!nativeReady) {
      await captureChatState(page, test.info(), 'auto-open-native-precondition-missing')
      test.skip(true, 'Native chat source was not playable before fullscreen.')
      return
    }

    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.enterFullscreen())
    if (!fullscreenReady) {
      await captureChatState(page, test.info(), 'auto-open-fullscreen-precondition-missing')
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await overlay.expectSwitchReady()
    await expect(overlay.switchButton()).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
    await overlay.expectChatLoaded({ timeout: 15000 })

    await yt.expectFullscreenExited()
    await overlay.expectOverlayRemoved()
  })
})
