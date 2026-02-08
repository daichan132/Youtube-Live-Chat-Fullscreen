import { expect, test } from './fixtures'
import { reliableClick } from './utils/actions'
import { logChatDiagnostics, waitForNativeArchiveReplayPlayable } from './utils/chatDiagnostics'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'
import { archiveReplayUrls } from './utils/testUrls'

const isNativeChatClosed = () => {
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  if (!chatContainer || !chatFrameHost) return true

  const iframe = document.querySelector('#chatframe') as HTMLIFrameElement | null
  let href = ''
  if (iframe) {
    try {
      href = iframe.contentDocument?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
    } catch {
      href = iframe.getAttribute('src') ?? iframe.src ?? ''
    }
  }

  if (!href || href.includes('about:blank')) return true

  const showHideButton = document.querySelector('ytd-live-chat-frame #show-hide-button, #chat-container #show-hide-button')
  const closeButton = document.querySelector('ytd-live-chat-frame #close-button, #chat-container #close-button')
  if (showHideButton && !closeButton) return true

  const hiddenByAttribute =
    chatContainer.hasAttribute('hidden') ||
    chatFrameHost.hasAttribute('hidden') ||
    chatContainer.getAttribute('aria-hidden') === 'true' ||
    chatFrameHost.getAttribute('aria-hidden') === 'true'
  if (hiddenByAttribute) return true

  const containerStyle = window.getComputedStyle(chatContainer)
  const hostStyle = window.getComputedStyle(chatFrameHost)
  return (
    containerStyle.display === 'none' ||
    containerStyle.visibility === 'hidden' ||
    hostStyle.display === 'none' ||
    hostStyle.visibility === 'hidden'
  )
}

const isExtensionArchiveChatLoaded = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  const doc = iframe.contentDocument ?? null
  if (!doc) return false
  return doc.readyState === 'complete'
}

const isExtensionArchiveChatPlayable = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false

  const doc = iframe.contentDocument ?? null
  const href = doc?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
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

const isExtensionArchiveIframeBorrowed = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  return iframe.getAttribute('data-ylc-owned') !== 'true'
}

const closeNativeChat = async (page: import('@playwright/test').Page) => {
  if (await page.evaluate(isNativeChatClosed)) return true

  const selectors = [
    'ytd-live-chat-frame #show-hide-button button',
    'ytd-live-chat-frame #show-hide-button yt-icon-button',
    'ytd-live-chat-frame #close-button button',
    'ytd-live-chat-frame #close-button yt-icon-button',
    '#chat-container #show-hide-button button',
    '#chat-container #show-hide-button yt-icon-button',
    '#chat-container #close-button button',
    '#chat-container #close-button yt-icon-button',
    'ytd-live-chat-frame button[aria-label*="Hide chat"]',
    'ytd-live-chat-frame button[title*="Hide chat"]',
    '#chat-container button[aria-label*="Hide chat"]',
    '#chat-container button[title*="Hide chat"]',
  ]

  for (const selector of selectors) {
    const button = page.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return true
    }
  }

  return false
}

test('youtube archive replay chat works in fullscreen', async ({ page }) => {
  test.setTimeout(150000)
  let selectedUrl: string | null = null

  for (const url of archiveReplayUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await acceptYouTubeConsent(page)
      await page.waitForSelector('#movie_player', { state: 'attached', timeout: 20000 })
      await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: 20000 })
      selectedUrl = url
      break
    } catch {
      // Try next archive URL.
    }
  }

  if (!selectedUrl) {
    await logChatDiagnostics(page, 'live-chat-replay-archive-url-not-found')
    test.skip(true, 'No archive video with chat replay found. Set YLC_ARCHIVE_URL to run this test.')
    return
  }

  const closed = await closeNativeChat(page)
  if (!closed) {
    await logChatDiagnostics(page, 'live-chat-replay-native-close-failed')
    test.skip(true, 'Could not close native chat via UI controls.')
    return
  }
  await expect.poll(async () => page.evaluate(isNativeChatClosed), { timeout: 10000 }).toBe(true)

  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)
  await page.locator('#movie_player').hover()

  const archivePrecondition = await waitForNativeArchiveReplayPlayable(page)
  if (!archivePrecondition.ok) {
    await logChatDiagnostics(page, 'live-chat-replay-archive-precondition-not-met')
    test.skip(true, 'Native archive chat source did not become replay-playable in fullscreen.')
    return
  }

  const switchButton = page.locator(switchButtonSelector)
  await expect(switchButton).toBeVisible({ timeout: 10000 })
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  try {
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatLoaded), { timeout: 90000 }).toBe(true)
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 90000 }).toBe(true)
    await expect.poll(async () => page.evaluate(isExtensionArchiveIframeBorrowed), { timeout: 10000 }).toBe(true)
  } catch (error) {
    await logChatDiagnostics(page, 'live-chat-replay-overlay-attach-failed')
    throw error
  }
})
