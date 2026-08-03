import { expect, test } from '@e2e/fixtures'
import { openDeterministicOverlay } from '@e2e/support/deterministicSurfaces'

test.describe('production Chrome package smoke', () => {
  test('boots the packaged popup and content runtime without a testing bridge', async ({ page, extension }) => {
    expect(process.env.YLC_REQUIRE_E2E_BRIDGE).toBe('0')

    await page.goto(extension.url('popup.html'))
    await expect(page.getByLabel('Select language')).toBeVisible()
    await expect(page.locator('body')).not.toContainText('e2e.html')

    await openDeterministicOverlay(page)
    await expect(page.locator('[data-ylc-resizable]')).toBeVisible()
    await expect(page.locator('[data-ylc-chat-viewport]')).toBeVisible()
  })
})
