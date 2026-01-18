import { expect, test } from './fixtures'
import { findLiveUrlWithChat } from './utils/liveUrl'

const isNativeChatUsable = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  if (!secondary || !chatContainer || !chatFrameHost || !chatFrame) return false

  const secondaryStyle = window.getComputedStyle(secondary)
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)
  const isHidden =
    secondaryStyle.display === 'none' ||
    secondaryStyle.visibility === 'hidden' ||
    containerStyle.display === 'none' ||
    containerStyle.visibility === 'hidden' ||
    hostStyle.display === 'none' ||
    hostStyle.visibility === 'hidden'
  if (isHidden) return false

  const pointerBlocked =
    secondaryStyle.pointerEvents === 'none' ||
    containerStyle.pointerEvents === 'none' ||
    hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
}

test('restore native chat after fullscreen toggle', async ({ page }) => {
  test.setTimeout(120000)

  await findLiveUrlWithChat(page)
  await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

  await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(true)

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator('#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec button.ytp-button')
  await expect(switchButton).toBeVisible()
  await switchButton.click()

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null)).toBe(true)

  await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(true)
})
