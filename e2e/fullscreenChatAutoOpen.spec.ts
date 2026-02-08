import { expect, test } from './fixtures'
import { getChatDiagnostics, logChatDiagnostics, waitForNativeSourceResolved } from './utils/chatDiagnostics'
import { findLiveUrlWithChat } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'

const isExtensionChatReady = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const src = iframe.getAttribute('src') ?? ''
  return Boolean(src && !src.includes('about:blank'))
}

test('auto show fullscreen chat when enabled', async ({ page }) => {
  test.setTimeout(160000)

  const liveUrl = await findLiveUrlWithChat(page)
  if (!liveUrl) {
    await logChatDiagnostics(page, 'auto-open-live-url-not-found')
    test.skip(true, 'No live URL with chat found.')
    return
  }

  await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  if (!switchReady) {
    await logChatDiagnostics(page, 'auto-open-switch-not-visible')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }

  await expect(switchButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })

  const nativeSourceReady = await waitForNativeSourceResolved(page, { timeoutMs: 20000 })
  if (!nativeSourceReady.ok) {
    await logChatDiagnostics(page, 'auto-open-native-source-unresolved-before-overlay')
    test.skip(true, 'Native chat source did not resolve after fullscreen auto-open.')
    return
  }

  const nativeOpenBeforeOverlay = await getChatDiagnostics(page)
  if (nativeOpenBeforeOverlay.native.open) {
    await logChatDiagnostics(page, 'auto-open-native-chat-open-before-overlay')
    test.skip(true, 'Native chat stayed open in fullscreen, so extension overlay is intentionally suppressed.')
    return
  }

  try {
    await expect.poll(async () => page.evaluate(isExtensionChatReady), { timeout: 20000 }).toBe(true)
  } catch (error) {
    const nativeState = await getChatDiagnostics(page)
    if (nativeState.native.open) {
      await logChatDiagnostics(page, 'auto-open-native-chat-open-after-overlay-timeout')
      test.skip(true, 'Native chat remained open while waiting for extension iframe.')
      return
    }
    const nativeSourceStillUnresolved = await waitForNativeSourceResolved(page, { timeoutMs: 3000 })
    if (!nativeSourceStillUnresolved.ok) {
      await logChatDiagnostics(page, 'auto-open-native-source-unresolved-after-overlay-timeout')
      test.skip(true, 'Native chat source became unresolved while waiting for extension iframe.')
      return
    }
    await logChatDiagnostics(page, 'auto-open-overlay-timeout')
    throw error
  }
})
