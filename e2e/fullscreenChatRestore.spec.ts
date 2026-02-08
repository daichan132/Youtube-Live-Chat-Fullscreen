import { expect, test } from './fixtures'
import { reliableClick } from './utils/actions'
import { logChatDiagnostics, waitForNativeArchiveReplayPlayable } from './utils/chatDiagnostics'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'
import { archiveReplayUrls } from './utils/testUrls'

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

const isExtensionBorrowedArchiveChatPlayable = () => {
  const host = document.getElementById('shadow-root-live-chat')
  const root = host?.shadowRoot ?? null
  const iframe = root?.querySelector('iframe[data-ylc-chat="true"]') as HTMLIFrameElement | null
  if (!iframe) return false
  if (iframe.getAttribute('data-ylc-owned') === 'true') return false
  const doc = iframe.contentDocument ?? null
  const href = doc?.location?.href ?? iframe.getAttribute('src') ?? iframe.src ?? ''
  if (!doc || !href || href.includes('about:blank')) return false
  return Boolean(doc.querySelector('yt-live-chat-renderer') && doc.querySelector('yt-live-chat-item-list-renderer'))
}

const getNativeChatDebugState = () => {
  const secondary = document.querySelector('#secondary') as HTMLElement | null
  const chatContainer = document.querySelector('#chat-container') as HTMLElement | null
  const chatFrameHost = document.querySelector('ytd-live-chat-frame') as HTMLElement | null
  const chatFrame = document.querySelector('#chatframe') as HTMLIFrameElement | null
  const secondaryStyle = secondary ? window.getComputedStyle(secondary) : null
  const containerStyle = chatContainer ? window.getComputedStyle(chatContainer) : null
  const hostStyle = chatFrameHost ? window.getComputedStyle(chatFrameHost) : null
  return {
    fullscreen: document.fullscreenElement !== null,
    hasSecondary: Boolean(secondary),
    hasContainer: Boolean(chatContainer),
    hasHost: Boolean(chatFrameHost),
    hasFrame: Boolean(chatFrame),
    secondaryDisplay: secondaryStyle?.display ?? '',
    secondaryVisibility: secondaryStyle?.visibility ?? '',
    secondaryPointerEvents: secondaryStyle?.pointerEvents ?? '',
    containerDisplay: containerStyle?.display ?? '',
    containerVisibility: containerStyle?.visibility ?? '',
    containerPointerEvents: containerStyle?.pointerEvents ?? '',
    hostDisplay: hostStyle?.display ?? '',
    hostVisibility: hostStyle?.visibility ?? '',
    hostPointerEvents: hostStyle?.pointerEvents ?? '',
    secondaryWidth: secondary?.getBoundingClientRect().width ?? 0,
    hostWidth: chatFrameHost?.getBoundingClientRect().width ?? 0,
    hostHeight: chatFrameHost?.getBoundingClientRect().height ?? 0,
    frameHeight: chatFrame?.getBoundingClientRect().height ?? 0,
  }
}

test('restore native chat after archive fullscreen chat closes', async ({ page }) => {
  test.setTimeout(120000)

  const candidateUrls = process.env.YLC_ARCHIVE_URL ? [process.env.YLC_ARCHIVE_URL] : archiveReplayUrls
  let selectedUrl: string | null = null

  for (const url of candidateUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await acceptYouTubeConsent(page)
      await page.waitForSelector('ytd-live-chat-frame', { state: 'attached', timeout: 20000 })
      selectedUrl = url
      break
    } catch {
      // Try next archive URL.
    }
  }

  if (!selectedUrl) {
    await logChatDiagnostics(page, 'fullscreen-restore-archive-url-not-found')
    test.skip(true, 'No archive video with chat replay found. Set YLC_ARCHIVE_URL to run this test.')
    return
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  const archivePrecondition = await waitForNativeArchiveReplayPlayable(page)
  if (!archivePrecondition.ok) {
    await logChatDiagnostics(page, 'fullscreen-restore-archive-precondition-not-met')
    test.skip(true, 'Native archive chat source did not become replay-playable in fullscreen.')
    return
  }

  await page.locator('#movie_player').hover()
  const switchButton = page.locator(switchButtonSelector)
  await expect(switchButton).toBeVisible()
  await reliableClick(switchButton, page, switchButtonSelector)
  await expect(switchButton).toHaveAttribute('aria-pressed', 'true')
  try {
    await expect.poll(async () => page.evaluate(isExtensionBorrowedArchiveChatPlayable), { timeout: 90000 }).toBe(true)
  } catch (error) {
    await logChatDiagnostics(page, 'fullscreen-restore-overlay-not-playable')
    throw error
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await expect.poll(async () => page.evaluate(() => document.fullscreenElement === null)).toBe(true)
  try {
    await expect.poll(async () => page.evaluate(isNativeChatUsable), { timeout: 15000 }).toBe(true)
  } catch (error) {
    await logChatDiagnostics(page, 'fullscreen-restore-native-not-restored')
    const nativeDebugState = await page.evaluate(getNativeChatDebugState)
    // eslint-disable-next-line no-console
    console.log('[fullscreenChatRestore][native-debug]', nativeDebugState)
    throw error
  }
})
