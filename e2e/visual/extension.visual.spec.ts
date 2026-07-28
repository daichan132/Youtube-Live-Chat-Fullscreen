import { expect, test } from '@e2e/fixtures'
import { openDeterministicOverlay, stabilizeExtensionRendering } from '@e2e/support/deterministicSurfaces'

test.describe('extension visual regression', () => {
  test('popup light', async ({ page, extension }) => {
    await page.goto(extension.url('popup.html'))
    const popup = page.locator('div[data-ylc-theme]').filter({ has: page.getByLabel('Select language') })
    await expect(popup).toBeVisible()
    await stabilizeExtensionRendering(page)

    await expect(popup).toHaveScreenshot('popup-light.png')
  })

  test('popup dark', async ({ page, extension }) => {
    await page.goto(extension.url('popup.html'))
    await page.getByRole('radio', { name: /^dark$/i }).check({ force: true })
    const popup = page.locator('div[data-ylc-theme="dark"]').filter({ has: page.getByLabel('Select language') })
    await expect(popup).toBeVisible()
    await stabilizeExtensionRendering(page)

    await expect(popup).toHaveScreenshot('popup-dark.png')
  })

  test('overlay default', async ({ page }) => {
    await openDeterministicOverlay(page)
    const overlay = page.locator('[data-ylc-resizable]')
    await expect(overlay).toBeVisible()
    await overlay.hover()
    await expect(page.locator('[data-ylc-control-rail]')).toBeVisible()

    await expect(overlay).toHaveScreenshot('overlay-default.png')
  })
})
