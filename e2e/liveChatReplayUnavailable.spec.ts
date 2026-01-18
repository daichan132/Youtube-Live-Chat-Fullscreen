import { expect, test } from './fixtures'
import { acceptYouTubeConsent } from './utils/liveUrl'
import { replayUnavailableUrls } from './utils/testUrls'

test('hide fullscreen chat button when replay chat is unavailable', async ({ page }) => {
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
    test.skip(true, 'No replay-unavailable URL could be loaded.')
  }

  await page.waitForSelector('#movie_player', { state: 'attached' })
  await page.waitForSelector('#chatframe', { state: 'attached', timeout: 20000 }).catch(() => null)

  await page.locator('#movie_player').hover()
  await page.click('button.ytp-fullscreen-button')
  await page.waitForFunction(() => document.fullscreenElement !== null)

  await page.locator('#movie_player').hover()
  const switchButtonAppeared = await page
    .waitForSelector('#switch-button-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec', { timeout: 10000 })
    .then(() => true, () => false)
  expect(switchButtonAppeared).toBe(false)

  const shadowHostAppeared = await page.waitForSelector('#shadow-root-live-chat', { timeout: 10000 }).then(() => true, () => false)
  expect(shadowHostAppeared).toBe(false)
})
