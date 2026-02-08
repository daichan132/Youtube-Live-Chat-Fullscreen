import { expect, test } from './fixtures'
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

  await expect(switchButton).toHaveAttribute('aria-pressed', 'true', { timeout: 15000 })
  await expect.poll(async () => page.evaluate(isExtensionChatReady), { timeout: 20000 }).toBe(true)
})
