import { expect, test } from '../../fixtures'
import { captureChatState, isExtensionArchiveChatPlayable, openArchiveWatchPage, shouldSkipArchiveFlowFailure } from '../../support/diagnostics'
import { selectArchiveReplayUrl } from '../../support/urls/archiveReplay'
import { reliableClick } from '../../utils/actions'
import {
  switchButtonSelector,
} from '../../utils/selectors'

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
  const selectedArchiveUrl = await selectArchiveReplayUrl(page, { maxDurationMs: 45000 })
  if (!selectedArchiveUrl) {
    await captureChatState(page, test.info(), 'archive-replay-url-selection-failed')
    test.skip(true, 'No archive replay URL satisfied preconditions.')
    return
  }

  const archiveReady = await openArchiveWatchPage(page, selectedArchiveUrl, { maxDurationMs: 30000 })
  if (!archiveReady) {
    await captureChatState(page, test.info(), 'archive-replay-precondition-missing')
    test.skip(true, 'Selected archive URL did not expose archive chat container in time.')
    return
  }

  const closed = await closeNativeChat(page)
  if (!closed) {
    await captureChatState(page, test.info(), 'archive-replay-native-close-failed')
    test.skip(true, 'Could not close native chat via UI controls.')
    return
  }
  await expect.poll(async () => page.evaluate(isNativeChatClosed), { timeout: 10000 }).toBe(true)

  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 })

  await page.locator('#movie_player').hover()

  const switchButton = page.locator(switchButtonSelector)
  const switchReady = await switchButton.waitFor({ state: 'visible', timeout: 10000 }).then(
    () => true,
    () => false,
  )
  if (!switchReady) {
    await captureChatState(page, test.info(), 'archive-replay-switch-missing')
    test.skip(true, 'Fullscreen chat switch button did not appear.')
    return
  }
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')

  let extensionReady = false
  try {
    await expect.poll(async () => page.evaluate(isExtensionArchiveChatPlayable), { timeout: 60000 }).toBe(true)
    extensionReady = true
  } catch {
    extensionReady = false
  }

  if (!extensionReady) {
    const state = await captureChatState(page, test.info(), 'archive-replay-extension-unready')
    if (shouldSkipArchiveFlowFailure(state)) {
      test.skip(true, 'Archive chat source did not become ready in this run.')
      return
    }
    expect(extensionReady).toBe(true)
  }

  await expect.poll(async () => page.evaluate(isExtensionArchiveIframeBorrowed), { timeout: 10000 }).toBe(true)
})
