import { expect, test } from '../fixtures'
import { ensureArchiveNativeChatPlayable, isExtensionArchiveChatPlayable, openArchiveWatchPage } from '../support/diagnostics'
import { reliableClick } from '../utils/actions'
import { switchButtonSelector } from '../utils/selectors'
import { patchOverlayStore } from '../utils/storageHelper'
import {
  SCREENSHOT_ARCHIVE_URL,
  clickSettingIcon,
  ensureScreenshotsDir,
  getChatMessageDiagnostics,
  hideYouTubeOverlays,
  hoverOverlay,
  isClipPathEnabled,
  movePointerAwayFromOverlay,
  pauseVideo,
  repositionOverlay,
  screenshotPath,
  seekVideo,
  setTheme,
  waitForAdsToFinish,
  waitForChatMessages,
  waitForPlayerControlsHidden,
} from './helpers'

const SEEK_SECONDS = 1800
const SCREENSHOT_FRAME_SECONDS = 1840

/** Frosted glass style: semi-transparent white bg, blur, white text, compact */
const OVERLAY_OVERRIDES = {
  bgColor: { r: 255, g: 255, b: 255, a: 0.1 },
  fontColor: { r: 255, g: 255, b: 255, a: 1 },
  fontFamily: 'Zen Maru Gothic',
  blur: 15,
  userNameDisplay: false,
  chatOnlyDisplay: true,
  alwaysOnDisplay: true,
}

/** Overlay position & size (applied via DOM after render, not via store) */
const OVERLAY_COORDINATES = { x: 910, y: 20 }
const OVERLAY_SIZE = { width: 350, height: 400 }

test.describe.serial('Screenshots', () => {
  test.beforeAll(() => {
    ensureScreenshotsDir()
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      const diag = await page.evaluate(getChatMessageDiagnostics).catch(() => null)
      if (diag) {
        await testInfo.attach('chat-diagnostics', {
          body: JSON.stringify(diag, null, 2),
          contentType: 'application/json',
        })
      }
      const screenshot = await page.screenshot().catch(() => null)
      if (screenshot) {
        await testInfo.attach('debug-screenshot', { body: screenshot, contentType: 'image/png' })
      }
    }
  })

  test('Popup screenshots (light & dark)', async ({ page, extensionId }) => {
    test.setTimeout(120000)

    await page.goto(`chrome-extension://${extensionId}/popup.html`)
    await page.getByLabel('Select language').waitFor({ state: 'visible', timeout: 30000 })

    // Light theme popup
    const popupRoot = page.locator('[data-ylc-theme]')
    await popupRoot.screenshot({ path: screenshotPath('popup-light') })

    // Dark theme popup
    await setTheme(page, extensionId, 'dark')
    await popupRoot.screenshot({ path: screenshotPath('popup-dark') })

    // Restore light theme
    await setTheme(page, extensionId, 'light')
  })

  test('Fullscreen chat light + settings', async ({ page, extensionId }) => {
    test.setTimeout(300000)

    // Seed store and patch overlay settings
    const patched = await patchOverlayStore(page, extensionId, OVERLAY_OVERRIDES)
    expect(patched, 'Store should be patched').not.toBeNull()

    const archiveReady = await openArchiveWatchPage(page, SCREENSHOT_ARCHIVE_URL, { maxDurationMs: 30000 })
    expect(archiveReady, 'Archive page should load').toBe(true)

    const nativeReady = await ensureArchiveNativeChatPlayable(page, { maxDurationMs: 30000 })
    expect(nativeReady, 'Native chat should be playable').toBe(true)

    await waitForAdsToFinish(page)
    await seekVideo(page, SEEK_SECONDS)
    await waitForAdsToFinish(page)

    // Inject persistent CSS to hide YouTube overlays early
    await hideYouTubeOverlays(page)

    // Enter fullscreen
    await page.locator('#movie_player').hover()
    await page.click('button.ytp-fullscreen-button')
    await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })
    await page.locator('#movie_player').hover()

    // Turn on chat
    const switchButton = page.locator(switchButtonSelector)
    await switchButton.waitFor({ state: 'visible', timeout: 10000 })
    if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
      await reliableClick(switchButton, page, switchButtonSelector)
    }

    await page.waitForFunction(isExtensionArchiveChatPlayable, undefined, { timeout: 60000 })

    // Wait for actual chat messages to appear
    const chatResult = await waitForChatMessages(page, { timeoutMs: 30000, minMessageCount: 1 })
    expect(chatResult.success, `Chat messages missing: ${JSON.stringify(chatResult.diagnostics)}`).toBe(true)

    // Seek to cinematic frame and freeze
    await seekVideo(page, SCREENSHOT_FRAME_SECONDS)
    await pauseVideo(page)
    await repositionOverlay(page, OVERLAY_COORDINATES, OVERLAY_SIZE)

    // chatOnlyDisplay: move pointer away and wait for clip-path + controls auto-hide
    await movePointerAwayFromOverlay(page)
    await expect.poll(async () => page.evaluate(isClipPathEnabled), { timeout: 15000 }).toBe(true)
    await waitForPlayerControlsHidden(page)

    await page.screenshot({ path: screenshotPath('fullscreen-chat-overview') })

    // --- Settings modal (light) ---
    let hovered = await hoverOverlay(page)
    expect(hovered, 'Overlay should be hoverable').toBe(true)
    const clickedSetting = await page.evaluate(clickSettingIcon)
    expect(clickedSetting, 'Setting icon should be clickable').toBe(true)

    await page.waitForFunction(
      () => {
        const host = document.getElementById('shadow-root-live-chat')
        const root = host?.shadowRoot ?? null
        return Boolean(root?.querySelector('.ylc-setting-panel'))
      },
      undefined,
      { timeout: 10000 },
    )

    await movePointerAwayFromOverlay(page)
    await waitForPlayerControlsHidden(page)
    await page.screenshot({ path: screenshotPath('settings-setting-light') })
  })

  test('Dark theme (chat, controls & settings)', async ({ page, extensionId }) => {
    test.setTimeout(300000)

    // Set dark theme first (needs popup open)
    await setTheme(page, extensionId, 'dark')

    // Seed store and patch overlay settings
    const patched = await patchOverlayStore(page, extensionId, OVERLAY_OVERRIDES)
    expect(patched, 'Store should be patched').not.toBeNull()

    const archiveReady = await openArchiveWatchPage(page, SCREENSHOT_ARCHIVE_URL, { maxDurationMs: 30000 })
    expect(archiveReady, 'Archive page should load').toBe(true)

    const nativeReady = await ensureArchiveNativeChatPlayable(page, { maxDurationMs: 30000 })
    expect(nativeReady, 'Native chat should be playable').toBe(true)

    await waitForAdsToFinish(page)
    await seekVideo(page, SEEK_SECONDS)
    await waitForAdsToFinish(page)

    // Inject persistent CSS to hide YouTube overlays early
    await hideYouTubeOverlays(page)

    // Enter fullscreen
    await page.locator('#movie_player').hover()
    await page.click('button.ytp-fullscreen-button')
    await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })
    await page.locator('#movie_player').hover()

    const switchButton = page.locator(switchButtonSelector)
    await switchButton.waitFor({ state: 'visible', timeout: 10000 })

    if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
      await reliableClick(switchButton, page, switchButtonSelector)
    }

    await page.waitForFunction(isExtensionArchiveChatPlayable, undefined, { timeout: 60000 })

    // Wait for actual chat messages to appear
    const chatResultDark = await waitForChatMessages(page, { timeoutMs: 30000, minMessageCount: 1 })
    expect(chatResultDark.success, `Chat messages missing: ${JSON.stringify(chatResultDark.diagnostics)}`).toBe(true)

    // Seek to cinematic frame and freeze
    await seekVideo(page, SCREENSHOT_FRAME_SECONDS)
    await pauseVideo(page)
    await repositionOverlay(page, OVERLAY_COORDINATES, OVERLAY_SIZE)

    // chatOnlyDisplay: move pointer away and wait for clip-path + controls auto-hide
    await movePointerAwayFromOverlay(page)
    await expect.poll(async () => page.evaluate(isClipPathEnabled), { timeout: 15000 }).toBe(true)
    await waitForPlayerControlsHidden(page)

    const hovered = await hoverOverlay(page)
    expect(hovered, 'Overlay should be hoverable').toBe(true)
    const clickedSetting = await page.evaluate(clickSettingIcon)
    expect(clickedSetting, 'Setting icon should be clickable').toBe(true)

    await page.waitForFunction(
      () => {
        const host = document.getElementById('shadow-root-live-chat')
        const root = host?.shadowRoot ?? null
        return Boolean(root?.querySelector('.ylc-setting-panel'))
      },
      undefined,
      { timeout: 10000 },
    )

    await movePointerAwayFromOverlay(page)
    await waitForPlayerControlsHidden(page)
    await page.screenshot({ path: screenshotPath('settings-setting-dark') })
  })
})
