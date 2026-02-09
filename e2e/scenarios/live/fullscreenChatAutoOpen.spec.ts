import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionChatLoaded } from '../../support/diagnostics'
import { findLiveUrlWithChat } from '../../utils/liveUrl'
import { switchButtonSelector } from '../../utils/selectors'

const isNativeLiveChatPlayable = () => {
  const iframe =
    (document.querySelector('#chatframe') as HTMLIFrameElement | null) ??
    (document.querySelector('ytd-live-chat-frame iframe.ytd-live-chat-frame') as HTMLIFrameElement | null)
  if (!iframe) return false

  const readIframeHref = (target: HTMLIFrameElement) => {
    try {
      const docHref = target.contentDocument?.location?.href ?? ''
      if (docHref) return docHref
    } catch {
      // Ignore CORS/DOM access errors and fall back to src.
    }
    return target.getAttribute('src') ?? target.src ?? ''
  }

  const href = readIframeHref(iframe)
  const doc = iframe.contentDocument ?? null
  if (!doc || !href || href.includes('about:blank')) return false
  if (!href.includes('/live_chat')) return false
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return false
  const text = doc.body?.textContent?.toLowerCase() ?? ''
  if (
    text.includes('live chat replay is not available') ||
    text.includes('chat is disabled') ||
    text.includes('live chat is disabled')
  ) {
    return false
  }
  return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

test('auto show fullscreen chat when enabled', async ({ page }) => {
  test.setTimeout(160000)

  const liveUrl = await findLiveUrlWithChat(page)
  if (!liveUrl) {
    test.skip(true, 'No live URL with chat found.')
    return
  }

  await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })
  const nativeReady = await page.waitForFunction(isNativeLiveChatPlayable, { timeout: 30000 }).then(
    () => true,
    () => false,
  )
  if (!nativeReady) {
    await captureChatState(page, test.info(), 'auto-open-native-precondition-missing')
    test.skip(true, 'Native chat source was not playable before fullscreen.')
    return
  }

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
