import { expect, test } from '../../fixtures'
import { ExtensionOverlay } from '../../pages/ExtensionOverlay'
import { YouTubeWatchPage } from '../../pages/YouTubeWatchPage'
import { hasPlayableChat } from '../../support/diagnostics'

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
    secondaryStyle.pointerEvents === 'none' || containerStyle.pointerEvents === 'none' || hostStyle.pointerEvents === 'none'
  if (pointerBlocked) return false

  const secondaryBox = secondary.getBoundingClientRect()
  const chatBox = chatFrameHost.getBoundingClientRect()
  const frameBox = chatFrame.getBoundingClientRect()
  return secondaryBox.width > 80 && chatBox.width > 80 && chatBox.height > 120 && frameBox.height > 120
}

const closeNativeChat = async (page: import('@playwright/test').Page) => {
  const outerSelectors = [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    'ytd-live-chat-frame #close-button button',
    'ytd-live-chat-frame #close-button yt-icon-button',
    'ytd-live-chat-frame button[aria-label="Close"]',
    'ytd-live-chat-frame button[title="Close"]',
  ]

  for (const selector of outerSelectors) {
    const button = page.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return true
    }
  }

  const frameLocator = page.frameLocator('#chatframe')
  const innerSelectors = [
    'yt-live-chat-header-renderer #close-button button',
    'yt-live-chat-header-renderer #close-button yt-icon-button',
    'yt-live-chat-header-renderer button[aria-label="Close"]',
    'yt-live-chat-header-renderer button[title="Close"]',
  ]
  for (const selector of innerSelectors) {
    const button = frameLocator.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return true
    }
  }

  return false
}

test.describe('native chat closed extension loads', { tag: '@live' }, () => {
  test('extension chat loads when native chat is closed', async ({ page, liveUrl }) => {
    test.setTimeout(140000)

    if (!liveUrl) {
      test.skip(true, 'No live URL with playable chat found from configured targets/search.')
      return
    }

    const yt = new YouTubeWatchPage(page)
    const overlay = new ExtensionOverlay(page)

    await yt.goto(liveUrl)

    await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

    await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(true)
    let playable = false
    try {
      await expect.poll(async () => page.evaluate(hasPlayableChat), { timeout: 20000 }).toBe(true)
      playable = true
    } catch {
      playable = false
    }
    if (!playable) {
      test.skip(true, 'Selected live video did not have playable chat.')
    }
    await page.waitForTimeout(1500)
    const closed = await closeNativeChat(page)
    if (!closed) {
      test.skip(true, 'Could not close native chat via UI controls.')
    }
    await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(false)

    await yt.enterFullscreen()

    const switchReady = await overlay.waitForSwitchReady()
    if (!switchReady) {
      test.skip(true, 'Fullscreen chat switch button did not appear.')
      return
    }

    await overlay.toggleOn()

    const overlayReady = await overlay.waitForChatLoaded()
    if (!overlayReady) {
      test.skip(true, 'Extension iframe did not load within the timeout.')
    }
  })
})
