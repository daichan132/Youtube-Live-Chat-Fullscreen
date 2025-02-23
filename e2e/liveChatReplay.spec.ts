import { expect, test } from './fixtures'

test('youtube live archive test', async ({ page }) => {
  await page.goto('https://www.youtube.com/watch?v=hYR0DAU9gyQ')
  await page.waitForLoadState('networkidle')
  await page.locator('#chatframe').contentFrame()
  await page.click('button.ytp-fullscreen-button')

  const shadowHost = page.locator('#shadow-root-live-chat')
  const shadowRootHandle = await shadowHost.evaluateHandle(el => el.shadowRoot)
  expect(shadowRootHandle).toBeTruthy()
})
