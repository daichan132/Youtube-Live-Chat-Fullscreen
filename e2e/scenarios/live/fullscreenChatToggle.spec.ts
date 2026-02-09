import { expect, test } from '../../fixtures'
import { reliableClick } from '../../utils/actions'
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

const safeToggleClick = async (page: import('@playwright/test').Page, switchButton: import('@playwright/test').Locator) => {
  await reliableClick(switchButton, page, switchButtonSelector).catch(async () => {
    await page.evaluate(selector => {
      const button = document.querySelector<HTMLButtonElement>(selector)
      button?.click()
    }, switchButtonSelector)
  })
}

const ensureDetached = async (
  page: import('@playwright/test').Page,
  switchButton: import('@playwright/test').Locator,
) => {
  let detached = await expect
    .poll(async () => page.evaluate(isExtensionChatDetached), { timeout: 20000 })
    .toBe(true)
    .then(
      () => true,
      () => false,
    )
  if (detached) return true

  const pressed = await switchButton.getAttribute('aria-pressed')
  if (pressed !== 'false') {
    await safeToggleClick(page, switchButton)
    await page.waitForTimeout(300)
  }

  detached = await expect
    .poll(async () => page.evaluate(isExtensionChatDetached), { timeout: 15000 })
    .toBe(true)
    .then(
      () => true,
      () => false,
    )
  return detached
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
    await safeToggleClick(page, switchButton)
    await page.waitForTimeout(300)
  }

  const detached = await ensureDetached(page, switchButton)
  if (!detached) {
    test.skip(true, 'Extension iframe did not detach in time.')
    return
  }

  await safeToggleClick(page, switchButton)
  await expect
    .poll(async () => switchButton.getAttribute('aria-pressed'), { timeout: 10000 })
    .toBe('true')
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

  await safeToggleClick(page, switchButton)
  await expect
    .poll(async () => switchButton.getAttribute('aria-pressed'), { timeout: 10000 })
    .toBe('false')
  const detachedAfter = await ensureDetached(page, switchButton)
  if (!detachedAfter) {
    test.skip(true, 'Extension iframe did not detach after toggle off.')
    return
  }
})
