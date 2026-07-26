import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import {
  expectContinuousChatOnlyMotion,
  getChatOnlyChromeCollapseSnapshot,
  getOverlayCenter,
  installChatOnlyMotionProbe,
  isChatOnlyChromeHidden,
  movePointerAwayFromOverlay,
  readChatOnlyMotionProbe,
  setPersistedChatOnlyMode,
  stabilizeYouTubePlaybackUi,
} from '@e2e/screenshots/helpers'
import { captureChatState, hasYouTubePlayerError, isNativeLiveChatPlayable } from '@e2e/support/diagnostics'

test.describe('live chat-only hover height', { tag: '@live' }, () => {
  test('live input boundary expands in one continuous transition', async ({ page, extension, liveUrl }) => {
    test.setTimeout(180000)
    if (!liveUrl) {
      test.skip(true, 'No live URL with playable chat found.')
      return
    }

    await setPersistedChatOnlyMode(extension)
    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)
    await yt.goto(liveUrl)
    await yt.waitForNativeChat()
    const nativeReady = await page.waitForFunction(isNativeLiveChatPlayable, undefined, { timeout: 30000 }).then(
      () => true,
      () => false,
    )
    if (!nativeReady) {
      await captureChatState(page, test.info(), 'live-chat-only-native-precondition-missing')
      test.skip(true, 'Native live chat stopped meeting test preconditions.')
      return
    }

    expect(await stabilizeYouTubePlaybackUi(page), 'YouTube ads and playback prompts should settle before fullscreen').toBe(true)

    const fullscreenReady = await yt.ensureFullscreen()
    if (!fullscreenReady) {
      const state = await captureChatState(page, test.info(), 'live-chat-only-fullscreen-unavailable')
      const playerError = await page.evaluate(hasYouTubePlayerError)
      if (playerError || !state?.native.playable) {
        test.skip(true, 'YouTube live playback stopped meeting fullscreen test preconditions.')
        return
      }
      expect(fullscreenReady).toBe(true)
    }

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      await captureChatState(page, test.info(), 'live-chat-only-switch-missing')
      const playerError = await page.evaluate(hasYouTubePlayerError)
      const nativeStillPlayable = await page.evaluate(isNativeLiveChatPlayable)
      if (playerError || !nativeStillPlayable) {
        test.skip(true, 'Native live chat stopped meeting switch test preconditions.')
        return
      }
    }
    expect(switchReady).toBe(true)
    await overlay.toggleOn()
    const chatLoaded = await overlay.waitForChatLoaded()
    if (!chatLoaded) await captureChatState(page, test.info(), 'live-chat-only-iframe-unloaded')
    expect(chatLoaded).toBe(true)

    await movePointerAwayFromOverlay(page)
    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(true)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(snapshot => snapshot.allTargetsCollapsed), {
        timeout: 15000,
      })
      .toBe(true)

    const center = await page.evaluate(getOverlayCenter)
    if (!center) await captureChatState(page, test.info(), 'live-chat-only-overlay-center-missing')
    expect(center).not.toBeNull()
    if (!center) throw new Error('Overlay center could not be resolved.')

    await expect
      .poll(async () => page.evaluate(installChatOnlyMotionProbe, { requireInput: true }), { timeout: 15000 })
      .toBe(true)
    await page.mouse.move(center.x, center.y)
    await expect.poll(async () => page.evaluate(isChatOnlyChromeHidden), { timeout: 15000 }).toBe(false)
    await expect
      .poll(async () => page.evaluate(getChatOnlyChromeCollapseSnapshot).then(snapshot => snapshot.allTargetsCollapsed), {
        timeout: 15000,
      })
      .toBe(false)
    await expect.poll(async () => page.evaluate(readChatOnlyMotionProbe).then(probe => probe?.done ?? false), { timeout: 2500 }).toBe(true)

    const expansionMotion = await page.evaluate(readChatOnlyMotionProbe)
    expectContinuousChatOnlyMotion(expansionMotion, 'expanding', { requireInput: true })
  })
})
