import { expect, test } from '@e2e/fixtures'
import { installCheckerboardVideoSurface, openDeterministicOverlay, stabilizeExtensionRendering } from '@e2e/support/deterministicSurfaces'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import { decodePng, edgeEnergy, meanPixelDifference } from './pixelMetrics'

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

  test('blur visibly softens only the bounded overlay background', async ({ page, extension }) => {
    expect(
      await patchOverlayStore(extension, {
        profile: { appearance: { blur: 0, backgroundColor: { r: 255, g: 255, b: 255, a: 0.12 } } },
      }),
    ).not.toBeNull()
    await openDeterministicOverlay(page)
    await installCheckerboardVideoSurface(page)

    const background = page.locator('[data-ylc-chat-background]')
    await expect(background).toHaveCSS('backdrop-filter', 'none')
    const unblurred = decodePng(await page.screenshot({ animations: 'disabled' }))
    const bounds = await background.boundingBox()
    if (!bounds) throw new Error('Overlay background has no pixel bounds.')
    const inside = {
      x: Math.round(bounds.x + 32),
      y: Math.round(bounds.y + 32),
      width: Math.round(bounds.width - 64),
      height: Math.round(bounds.height - 64),
    }
    const outside = [
      { x: 16, y: 16, width: 96, height: 96 },
      { x: unblurred.width - 112, y: 16, width: 96, height: 96 },
      { x: 16, y: unblurred.height - 112, width: 96, height: 96 },
      { x: unblurred.width - 112, y: unblurred.height - 112, width: 96, height: 96 },
    ].find(
      sample =>
        sample.x + sample.width <= bounds.x ||
        sample.x >= bounds.x + bounds.width ||
        sample.y + sample.height <= bounds.y ||
        sample.y >= bounds.y + bounds.height,
    )
    if (!outside) throw new Error('Could not find an outside-video sample that avoids the overlay.')

    expect(await patchOverlayStore(extension, { profile: { appearance: { blur: 16 } } })).not.toBeNull()
    await expect(background).toHaveCSS('backdrop-filter', 'blur(16px)')
    const blurred = decodePng(await page.screenshot({ animations: 'disabled' }))

    expect(edgeEnergy(unblurred, inside)).toBeGreaterThan(12)
    expect(edgeEnergy(blurred, inside)).toBeLessThan(edgeEnergy(unblurred, inside) * 0.65)
    expect(meanPixelDifference(unblurred, blurred, outside)).toBeLessThan(0.1)
  })
})
