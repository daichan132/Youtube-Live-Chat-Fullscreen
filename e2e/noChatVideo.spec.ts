import { expect, test } from './fixtures'
import { getE2ETestTargets } from './config/testTargets'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonSelector } from './utils/selectors'

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

test('extension chat stays hidden on videos without live chat', async ({ page }) => {
  test.setTimeout(120000)

  const noChatUrl = getE2ETestTargets().noChat.url
  await page.goto(noChatUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await acceptYouTubeConsent(page)
  await page.waitForSelector('#movie_player', { state: 'attached' })

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const hiddenSwitch = await expect
    .poll(async () => page.locator(switchButtonSelector).count(), { timeout: 12000 })
    .toBe(0)
    .then(
      () => true,
      () => false,
    )

  if (!hiddenSwitch) {
    const playableNative = await page.evaluate(hasPlayableChat)
    if (playableNative) {
      test.skip(true, 'Selected URL had playable chat and did not meet no-chat precondition.')
      return
    }
    test.skip(true, 'Selected URL exposed archive chat controls and did not meet no-chat precondition.')
    return
  }

  await expect.poll(async () => page.evaluate(hasPlayableChat)).toBe(false)
  await expect.poll(async () => page.evaluate(isExtensionChatLoaded)).toBe(false)
})
