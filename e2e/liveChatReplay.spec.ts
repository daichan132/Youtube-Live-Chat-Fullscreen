import { expect, test } from './fixtures'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { archiveReplayUrls } from './utils/testUrls'

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

const isNativeChatClosed = () => {
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!chatContainer || !chatFrameHost) return true
  const isHiddenAttr =
    chatContainer.hasAttribute('hidden') ||
    chatFrameHost.hasAttribute('hidden') ||
    chatContainer.getAttribute('aria-hidden') === 'true' ||
    chatFrameHost.getAttribute('aria-hidden') === 'true'
  if (isHiddenAttr) return true
  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)
  return (
    containerStyle.display === 'none' ||
    containerStyle.visibility === 'hidden' ||
    hostStyle.display === 'none' ||
    hostStyle.visibility === 'hidden'
  )
}

const closeNativeChat = async (page: import('@playwright/test').Page) => {
  const selectors = [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    'ytd-live-chat-frame #close-button button',
    'ytd-live-chat-frame #close-button yt-icon-button',
    'ytd-live-chat-frame button[aria-label="Close"]',
    'ytd-live-chat-frame button[title="Close"]',
  ]

  for (const selector of selectors) {
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
  return Boolean(doc && doc.readyState === 'complete')
}

const isExtensionChatPlayable = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot
  if (!root) return false
  const iframe = root.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const doc = iframe.contentDocument ?? null
  const href = doc?.location?.href ?? iframe.getAttribute('src') ?? ''
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

const getExtensionChatMessageCount = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot
  if (!root) return 0
  const iframe = root.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return 0
  const doc = iframe.contentDocument ?? null
  if (!doc) return 0
  const selectors = [
    'yt-live-chat-text-message-renderer',
    'yt-live-chat-paid-message-renderer',
    'yt-live-chat-paid-sticker-renderer',
    'yt-live-chat-membership-item-renderer',
    'yt-live-chat-viewer-engagement-message-renderer',
    'yt-live-chat-banner-renderer',
  ]
  let count = 0
  for (const selector of selectors) {
    count += doc.querySelectorAll(selector).length
  }
  return count
}

const ensureVideoPlaying = async (page: import('@playwright/test').Page) => {
  const isPaused = await page.evaluate(() => {
    const video = document.querySelector('video') as HTMLVideoElement | null
    return Boolean(video?.paused)
  })
  if (isPaused) {
    await page.locator('#movie_player').click({ position: { x: 10, y: 10 } }).catch(() => null)
    await page.keyboard.press('k').catch(() => null)
  }
  return page
    .waitForFunction(() => {
      const video = document.querySelector('video') as HTMLVideoElement | null
      return Boolean(video && !video.paused)
    })
    .then(() => true, () => false)
}

test('youtube live archive test', async ({ page }) => {
  test.setTimeout(120000)

  const candidateUrls = archiveReplayUrls
  let selectedUrl: string | null = null

  for (const url of candidateUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await acceptYouTubeConsent(page)
      await page.waitForSelector('#movie_player', { state: 'attached' })
      await page.waitForSelector('ytd-live-chat-frame', { state: 'attached' }).catch(() => null)
      await expect.poll(async () => page.evaluate(hasPlayableChat), { timeout: 20000 }).toBe(true)
      selectedUrl = url
      break
    } catch {
      // URL failed, try the next one
    }
  }

  if (!selectedUrl) {
    test.skip(true, 'No archive video with chat replay found. Set YLC_ARCHIVE_URL to run this test.')
  }

  const closed = await closeNativeChat(page)
  if (!closed) {
    test.skip(true, 'Could not close native chat via UI controls.')
  }
  await expect.poll(async () => page.evaluate(isNativeChatClosed), { timeout: 10000 }).toBe(true)

  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.waitForSelector('#shadow-root-live-chat', { state: 'attached' })
  await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(true)
  await expect.poll(async () => page.evaluate(isExtensionChatPlayable), { timeout: 20000 }).toBe(true)

  const playing = await ensureVideoPlaying(page)
  if (!playing) {
    test.skip(true, 'Video did not start playing, chat replay may not advance.')
  }
  await expect
    .poll(async () => page.evaluate(getExtensionChatMessageCount), { timeout: 30000 })
    .toBeGreaterThan(0)
})
