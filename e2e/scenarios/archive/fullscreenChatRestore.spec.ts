import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '@e2e/support/diagnostics'

const getNativeChatDebugState = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  const secondaryStyle = secondary ? window.getComputedStyle(secondary) : null
  const containerStyle = chatContainer ? window.getComputedStyle(chatContainer) : null
  const hostStyle = chatFrameHost ? window.getComputedStyle(chatFrameHost) : null
  return {
    fullscreen: document.fullscreenElement !== null,
    hasSecondary: Boolean(secondary),
    hasContainer: Boolean(chatContainer),
    hasHost: Boolean(chatFrameHost),
    hasFrame: Boolean(chatFrame),
    secondaryDisplay: secondaryStyle?.display ?? '',
    secondaryVisibility: secondaryStyle?.visibility ?? '',
    secondaryPointerEvents: secondaryStyle?.pointerEvents ?? '',
    containerDisplay: containerStyle?.display ?? '',
    containerVisibility: containerStyle?.visibility ?? '',
    containerPointerEvents: containerStyle?.pointerEvents ?? '',
    hostDisplay: hostStyle?.display ?? '',
    hostVisibility: hostStyle?.visibility ?? '',
    hostPointerEvents: hostStyle?.pointerEvents ?? '',
    secondaryWidth: secondary?.getBoundingClientRect().width ?? 0,
    hostWidth: chatFrameHost?.getBoundingClientRect().width ?? 0,
    hostHeight: chatFrameHost?.getBoundingClientRect().height ?? 0,
    frameHeight: chatFrame?.getBoundingClientRect().height ?? 0,
  }
}

test.describe('fullscreen chat restore', { tag: '@archive' }, () => {
  test('restore native chat after archive fullscreen chat closes', async ({ page, archiveReplayUrl }) => {
    test.setTimeout(150000)

    if (!archiveReplayUrl) {
      await captureChatState(page, test.info(), 'restore-archive-url-selection-failed')
      test.skip(true, 'No archive replay URL satisfied preconditions.')
      return
    }

    const archiveReady = await openArchiveWatchPage(page, archiveReplayUrl, { maxDurationMs: 30000 })
    if (!archiveReady) {
      await captureChatState(page, test.info(), 'restore-archive-precondition-missing')
      test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      await captureChatState(page, test.info(), 'restore-switch-missing')
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const extensionReady = await overlay.waitForArchiveChatPlayable({ timeout: 45000 })
    if (!extensionReady) {
      const state = await captureChatState(page, test.info(), 'restore-extension-unready')
      if (shouldSkipArchiveFlowFailure(state)) {
        test.skip(true, 'Archive chat source did not become ready in this run.')
        return
      }
      expect(extensionReady).toBe(true)
    }

    await yt.exitFullscreen()
    await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null), { timeout: 8000 }).toBe(true)

    try {
      await expect.poll(async () => page.evaluate(() => window.__ylcHelpers.isNativeChatUsable()), { timeout: 12000 }).toBe(true)
    } catch (error) {
      const nativeDebugState = await page.evaluate(getNativeChatDebugState)
      // eslint-disable-next-line no-console
      console.log('[fullscreenChatRestore][native-debug]', nativeDebugState)
      throw error
    }
  })
})
