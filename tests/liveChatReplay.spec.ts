import { test, expect } from './fixtures';

test('youtube live archive test', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=SBGcCLGkVMo');
  await page.waitForTimeout(2000);
  await page.click('button.ytp-fullscreen-button');

  await expect(
    page.locator('#my-extension-root #live-chat-iframe-wrapper iframe#chatframe'),
  ).toBeVisible();
});
