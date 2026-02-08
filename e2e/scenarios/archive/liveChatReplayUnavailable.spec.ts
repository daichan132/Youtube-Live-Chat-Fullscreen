import { expect, test } from '../../fixtures'
import { captureChatState } from '../../support/diagnostics'
import { selectReplayUnavailableUrl } from '../../support/urls/archiveReplay'
import { switchButtonContainerSelector } from '../../utils/selectors'

test('show fullscreen chat button when replay chat is unavailable', async ({ page }) => {
  test.setTimeout(90000)

  const selectedUrl = await selectReplayUnavailableUrl(page, { maxDurationMs: 30000 })
  if (!selectedUrl) {
    await captureChatState(page, test.info(), 'replay-unavailable-precondition-missing')
    test.skip(true, 'No replay-unavailable URL reached required native state.')
    return
  }

  await page.locator('#movie_player').hover()
  const fullscreenButton = page.locator('button.ytp-fullscreen-button')
  const fullscreenButtonReady = await fullscreenButton.isVisible({ timeout: 5000 }).catch(() => false)
  if (!fullscreenButtonReady) {
    await captureChatState(page, test.info(), 'replay-unavailable-fullscreen-button-missing')
    test.skip(true, 'Fullscreen button did not become visible.')
    return
  }
  await fullscreenButton.click({ force: true })
  const enteredFullscreen = await page.waitForFunction(() => document.fullscreenElement !== null, { timeout: 8000 }).then(
    () => true,
    () => false,
  )
  if (!enteredFullscreen) {
    await captureChatState(page, test.info(), 'replay-unavailable-fullscreen-failed')
    test.skip(true, 'Could not enter fullscreen within timeout.')
    return
  }

  await page.locator('#movie_player').hover()
  const switchButtonAppeared = await page
    .waitForSelector(switchButtonContainerSelector, { timeout: 8000 })
    .then(() => true, () => false)
  if (!switchButtonAppeared) {
    await captureChatState(page, test.info(), 'replay-unavailable-switch-missing')
  }
  expect(switchButtonAppeared).toBe(true)

  const shadowHostAppeared = await page.waitForSelector('#shadow-root-live-chat', { timeout: 7000 }).then(
    () => true,
    () => false,
  )
  expect(shadowHostAppeared).toBe(false)
})
