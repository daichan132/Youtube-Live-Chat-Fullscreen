import { expect, test } from './fixtures'

test('youtube live archive test', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('https://www.youtube.com/watch?v=SBGcCLGkVMo')

  const consentButton = page.locator('button:has-text("I Agree")')
  if (await consentButton.isVisible()) {
    await consentButton.click()
  }

  await page.waitForSelector('video', { state: 'visible', timeout: 10000 })
  await page.locator('video').scrollIntoViewIfNeeded()
  try {
    await page.locator('video').hover()
  } catch (error) {
    console.error('Hover failed:', error)
    await page.locator('video').click({ force: true })
  }

  await page.click('button.ytp-fullscreen-button')
  await expect(
    page.locator('#extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec #live-chat-iframe-wrapper iframe#chatframe'),
  ).toBeVisible()
})
