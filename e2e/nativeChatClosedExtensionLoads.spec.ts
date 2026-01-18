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
      return
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
      return
    }
  }

  await page.evaluate(() => {
    document.querySelector('#chat-container')?.setAttribute('hidden', 'true')
    document.querySelector('ytd-live-chat-frame')?.remove()
  })
}

const isExtensionChatLoaded = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot
  if (!root) return false
  const iframe = root.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const src = iframe.getAttribute('src') ?? ''
  if (!src || src.includes('about:blank')) return false
  const doc = iframe.contentDocument
  return Boolean(doc && doc.readyState === 'complete')
}

test('extension chat loads when native chat is closed', async ({ page }) => {
  test.setTimeout(140000)

  await findLiveUrlWithChat(page)
  await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' })

  await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(true)
  await closeNativeChat(page)
  await expect.poll(async () => page.evaluate(isNativeChatUsable)).toBe(false)

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator('#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec button.ytp-button')
  await expect(switchButton).toBeVisible()
  await switchButton.click({ force: true })
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>(
      '#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec button.ytp-button',
    )
    button?.click()
  })
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(true)
})
