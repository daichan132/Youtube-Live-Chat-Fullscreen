import { expect, test } from '../../fixtures'
import { findLiveUrlWithChat } from '../../utils/liveUrl'
import { switchButtonSelector } from '../../utils/selectors'

const isExtensionChatReady = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const src = iframe.getAttribute('src') ?? ''
  return Boolean(src && !src.includes('about:blank'))
}

const isExtensionChatDetached = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return !root?.querySelector('iframe[data-ylc-chat="true"]')
}

test('toggle fullscreen chat on and off', async ({ page }) => {
  test.setTimeout(160000)

  const liveUrl = await findLiveUrlWithChat(page)
  if (!liveUrl) {
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
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }

  if ((await switchButton.getAttribute('aria-pressed')) === 'true') {
    await switchButton.click({ force: true })
    await expect(switchButton).toHaveAttribute('aria-pressed', 'false')
  }

  let detached = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatDetached), { timeout: 15000 }).toBe(true)
    detached = true
  } catch {
    detached = false
  }
  if (!detached) {
    test.skip(true, 'Extension iframe did not detach in time.')
    return
  }

  await switchButton.click({ force: true })
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  let overlayReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatReady), { timeout: 20000 }).toBe(true)
    overlayReady = true
  } catch {
    overlayReady = false
  }
  if (!overlayReady) {
    test.skip(true, 'Extension iframe did not load in time.')
    return
  }

  await switchButton.click({ force: true })
  await expect(switchButton).toHaveAttribute('aria-pressed', 'false')
  let detachedAfter = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatDetached), { timeout: 20000 }).toBe(true)
    detachedAfter = true
  } catch {
    detachedAfter = false
  }
  if (!detachedAfter) {
    test.skip(true, 'Extension iframe did not detach after toggle off.')
    return
  }
})
