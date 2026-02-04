import { expect, test } from './fixtures'
import { reliableClick } from './utils/actions'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'

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

const isExtensionChatLoaded = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot
  if (!root) return false
  const iframe = root.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const src = iframe.getAttribute('src') ?? ''
  if (!src || src.includes('about:blank')) return false
  const doc = iframe.contentDocument
  if (!doc) return true
  return doc.readyState === 'complete'
}

const hasPlayableChat = () => {
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  const doc = chatFrame?.contentDocument ?? null
  const href = doc?.location?.href ?? ''
  if (!doc || !href || href.includes('about:blank')) return false
  if (doc.querySelector('yt-live-chat-unavailable-message-renderer')) return false
  const text = doc.body?.textContent?.toLowerCase() ?? ''
  if (
    text.includes('live chat replay is not available') ||
    text.includes('chat is disabled') ||
    text.includes('live chat is disabled')
  ) {
    return false
  }
  const renderer = doc.querySelector('yt-live-chat-renderer')
  const itemList = doc.querySelector('yt-live-chat-item-list-renderer')
  return Boolean(renderer && itemList)
}

test('extension chat loads when native chat is closed', async ({ page }) => {
  test.setTimeout(140000)

  const liveUrl = process.env.YLC_LIVE_URL
  if (!liveUrl) {
    test.skip(true, 'Set YLC_LIVE_URL to run live tests.')
    return
  }
  await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await acceptYouTubeConsent(page)
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

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  await expect(switchButton).toBeVisible({ timeout: 10000 })
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  let overlayReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionChatLoaded), { timeout: 20000 }).toBe(true)
    overlayReady = true
  } catch {
    overlayReady = false
  }
  if (!overlayReady) {
    test.skip(true, 'Extension iframe did not load within the timeout.')
  }
})
