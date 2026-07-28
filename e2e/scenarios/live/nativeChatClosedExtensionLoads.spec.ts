import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { hasPlayableChat } from '@e2e/support/diagnostics'
import { meetsExternalYouTubePrecondition } from '@e2e/support/externalYouTubePreconditions'
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

    const nativeFrameReady = await meetsExternalYouTubePrecondition('native-chat-frame', () => yt.expectNativeChat())
    if (!nativeFrameReady) {
      test.skip(true, 'Live URL did not expose a native chat frame.')
      return
    }
    const nativeUsable = await meetsExternalYouTubePrecondition('native-chat-source', () =>
      expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(true),
    )
    if (!nativeUsable) {
      test.skip(true, 'Selected live video did not expose a usable native chat source.')
      return
    }
    const playable = await meetsExternalYouTubePrecondition('native-chat-source', () =>
      expect.poll(async () => page.evaluate(hasPlayableChat), { timeout: 20000 }).toBe(true),
    )
    if (!playable) {
      test.skip(true, 'Selected live video did not have playable chat.')
      return
    }
    const closed = await closeNativeChat(page)
    if (!closed) {
      test.skip(true, 'Could not close native chat via UI controls.')
      return
    }
    const nativeClosed = await meetsExternalYouTubePrecondition('chat-close-ui', () =>
      expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable())).toBe(false),
    )
    if (!nativeClosed) {
      test.skip(true, 'YouTube did not settle the native chat close operation.')
      return
    }

    const fullscreenReady = await meetsExternalYouTubePrecondition('fullscreen-ui', () => yt.enterFullscreen())
    if (!fullscreenReady) {
      test.skip(true, 'YouTube fullscreen UI did not meet the canary precondition.')
      return
    }

    await overlay.expectSwitchReady()
    await overlay.toggleOn()
    await overlay.expectChatLoaded()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const iframe = window.__ylcHelpers.getExtensionIframe()
          return {
            owned: iframe?.getAttribute('data-ylc-owned') ?? null,
            source: iframe?.getAttribute('data-ylc-source') ?? null,
          }
        }),
      )
      .toEqual({ owned: 'true', source: 'live_direct' })
  })
})
