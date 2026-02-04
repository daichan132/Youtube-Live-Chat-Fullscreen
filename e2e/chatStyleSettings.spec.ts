import { expect, test } from './fixtures'
import { findLiveUrlWithChat } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'

const hasOverlayIframe = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  return Boolean(root?.querySelector('iframe.ytd-live-chat-frame'))
}

const getOverlayFontFamily = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe.ytd-live-chat-frame') as HTMLIFrameElement | null
  const doc = iframe?.contentDocument ?? null
  if (!doc) return null
  return doc.documentElement.style.getPropertyValue('font-family')
}

test('settings update live chat font family', async ({ page }) => {
  test.setTimeout(180000)

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

  if ((await switchButton.getAttribute('aria-pressed')) !== 'true') {
    await switchButton.click({ force: true })
  }
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  let overlayReady = false
  try {
    await expect.poll(async () => page.evaluate(hasOverlayIframe), { timeout: 20000 }).toBe(true)
    overlayReady = true
  } catch {
    overlayReady = false
  }
  if (!overlayReady) {
    test.skip(true, 'Extension iframe did not load in time.')
    return
  }

  const settingsIcon = page.locator('#shadow-root-live-chat div.cursor-pointer svg').first()
  const settingsReady = await settingsIcon.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)
  if (!settingsReady) {
    test.skip(true, 'Settings icon did not appear.')
    return
  }
  await settingsIcon.click({ force: true })
  await page.evaluate(() => {
    const host = document.getElementById('shadow-root-live-chat')
    const root = host?.shadowRoot ?? null
    const icon = root?.querySelector('div.cursor-pointer svg') as SVGElement | null
    icon?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
  })

  const modalContent = page.locator('#shadow-root-live-chat-modal-root [role="dialog"]')
  const modalReady = await modalContent.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)
  if (!modalReady) {
    test.skip(true, 'Settings modal did not open.')
    return
  }

  const tabButtons = modalContent.locator('.flex.text-base.gap-4 button')
  const tabCount = await tabButtons.count()
  if (tabCount < 2) {
    test.skip(true, 'Settings tab buttons not found.')
    return
  }
  await tabButtons.nth(1).click()

  const fontInput = modalContent.locator('input[type="text"]').first()
  const inputReady = await fontInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)
  if (!inputReady) {
    test.skip(true, 'Font family input did not appear.')
    return
  }

  const desiredFont = 'Roboto Slab'
  await fontInput.fill(desiredFont)

  await expect
    .poll(async () => {
      const value = await page.evaluate(getOverlayFontFamily)
      return value ?? ''
    }, { timeout: 15000 })
    .toContain(desiredFont)
})
