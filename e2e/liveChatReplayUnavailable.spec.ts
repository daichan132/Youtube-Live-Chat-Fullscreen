import { expect, test } from './fixtures'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { switchButtonContainerSelector } from './utils/selectors'
import { getChatDiagnostics, logChatDiagnostics, waitForNativeReplayUnavailable } from './utils/chatDiagnostics'
import { replayUnavailableUrls } from './utils/testUrls'

test('show fullscreen chat button when replay chat is unavailable', async ({ page }) => {
  test.setTimeout(120000)

  let selectedUrl: string | null = null
  for (const url of replayUnavailableUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await acceptYouTubeConsent(page)
      if (page.url().includes('consent')) {
        await page.waitForTimeout(1500)
        await acceptYouTubeConsent(page)
      }
      selectedUrl = url
      break
    } catch {
      continue
    }
  }
  if (!selectedUrl) {
    await logChatDiagnostics(page, 'replay-unavailable-url-not-found')
    test.skip(true, 'No replay-unavailable URL could be loaded.')
    return
  }

  await page.waitForSelector('#movie_player', { state: 'attached' })
  await page.waitForSelector('#chatframe', { state: 'attached', timeout: 20000 }).catch(() => null)

  const replayUnavailableReady = await waitForNativeReplayUnavailable(page)
  if (!replayUnavailableReady.ok) {
    await logChatDiagnostics(page, 'replay-unavailable-precondition-not-met')
    test.skip(true, 'Selected URL did not expose a replay-unavailable native chat state.')
    return
  }

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButtonAppeared = await page
    .waitForSelector(switchButtonContainerSelector, { timeout: 10000 })
    .then(() => true, () => false)
  expect(switchButtonAppeared).toBe(true)

  try {
    for (let index = 0; index < 8; index += 1) {
      const state = await getChatDiagnostics(page)
      expect(state.iframe.hasIframe).toBe(false)
      await page.waitForTimeout(500)
    }
  } catch (error) {
    await logChatDiagnostics(page, 'replay-unavailable-overlay-visible')
    throw error
  }
})
