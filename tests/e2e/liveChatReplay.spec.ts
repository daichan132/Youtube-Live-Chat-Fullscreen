import { expect, test } from './fixtures'

test('youtube live archive test', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=SBGcCLGkVMo')
  await page.locator('#chatframe').contentFrame().locator('yt-live-chat-text-message-renderer').isVisible
  await page.click('button.ytp-fullscreen-button')

  await expect(
    page.locator('#extension-root-d774ba85-ed7c-42a2-bf6f-a74e8d8605ec #live-chat-iframe-wrapper iframe#chatframe'),
  ).toBeVisible()
})
