import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'
import { captureChatState } from '@e2e/support/diagnostics'
import {
  expectContinuousChatOnlyMotion,
  getChatOnlyChromeCollapseSnapshot,
  getOverlayCenter,
  installChatOnlyMotionProbe,
  isChatOnlyChromeHidden,
  movePointerAwayFromOverlay,
  readChatOnlyMotionProbe,
  setPersistedChatOnlyMode,
} from '@e2e/screenshots/helpers'

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
    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) await captureChatState(page, test.info(), 'live-chat-only-switch-missing')
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

    expect(await page.evaluate(installChatOnlyMotionProbe)).toBe(true)
    await page.mouse.move(center.x, center.y)
    await expect.poll(async () => page.evaluate(readChatOnlyMotionProbe).then(probe => probe?.done ?? false), { timeout: 2500 }).toBe(true)

    const expansionMotion = await page.evaluate(readChatOnlyMotionProbe)
    expectContinuousChatOnlyMotion(expansionMotion, 'expanding', { requireInput: true })
  })
})
