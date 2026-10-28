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

  test('expanded reaction surface visibly blurs the content behind it', async ({ page, extension }, testInfo) => {
    await patchOverlayStore(extension, { profile: { appearance: { blur: 0 } } })
    await openDeterministicOverlay(page)
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    await chat.locator('body').evaluate(body => {
      body.insertAdjacentHTML(
        'beforeend',
        `<div data-reaction-blur-probe style="position:fixed;left:30px;top:50px;width:160px;height:100px;
          background:repeating-linear-gradient(90deg, black 0 8px, white 8px 16px);z-index:1000">
          <yt-reaction-control-panel-view-model reaction-control-panel-expanded>
            <div id="fab-container" style="position:absolute;inset:0"></div>
          </yt-reaction-control-panel-view-model>
        </div>`,
      )
    })
    const surface = chat.locator('[data-reaction-blur-probe] #fab-container')
    await expect(surface).toHaveCSS('backdrop-filter', 'none')
    const unblurredPng = await surface.screenshot({ animations: 'disabled' })
    await patchOverlayStore(extension, { profile: { appearance: { blur: 16 } } })
    await expect(surface).toHaveCSS('backdrop-filter', 'blur(16px)')
    const blurredPng = await surface.screenshot({ animations: 'disabled' })
    const sample = { x: 20, y: 20, width: 120, height: 60 }
    const before = edgeEnergy(decodePng(unblurredPng), sample)
    const after = edgeEnergy(decodePng(blurredPng), sample)
    await testInfo.attach('reaction-unblurred', { body: unblurredPng, contentType: 'image/png' })
    await testInfo.attach('reaction-blurred', { body: blurredPng, contentType: 'image/png' })
    expect(before).toBeGreaterThan(5)
    expect(after).toBeLessThan(before * 0.65)
  })

  test('blur visibly softens only the bounded overlay background', async ({ page, extension }, testInfo) => {
    expect(
      await patchOverlayStore(extension, {
        profile: { appearance: { blur: 0, backgroundColor: { r: 255, g: 255, b: 255, a: 0.12 } } },
      }),
    ).not.toBeNull()
    await openDeterministicOverlay(page)
    await installCheckerboardVideoSurface(page)

    const chat = page.frameLocator('iframe[data-ylc-chat]')
    await chat.locator('body').evaluate(body => {
      const text = body.ownerDocument.createElement('div')
      text.setAttribute('data-ylc-readability-probe', '')
      text.textContent = 'Readable chat 123'
      Object.assign(text.style, {
        position: 'fixed',
        top: '4px',
        left: '12px',
        width: '180px',
        height: '24px',
        background: 'white',
        color: 'black',
        fontSize: '16px',
        lineHeight: '24px',
        fontWeight: '700',
        zIndex: '1000',
      })
      body.append(text)
    })
    const readabilityProbe = chat.locator('[data-ylc-readability-probe]')
    await expect(readabilityProbe).toBeVisible()
    const textBounds = await readabilityProbe.boundingBox()
    if (!textBounds) throw new Error('Chat readability probe has no pixel bounds.')
    const textSample = {
      x: Math.round(textBounds.x + 4),
      y: Math.round(textBounds.y + 2),
      width: Math.round(textBounds.width - 8),
      height: Math.round(textBounds.height - 4),
    }
    const background = page.locator('[data-ylc-chat-background]')
    await expect(background).toHaveCSS('backdrop-filter', 'none')
    const unblurredPng = await page.screenshot({ animations: 'disabled' })
    const unblurred = decodePng(unblurredPng)
    const bounds = await background.boundingBox()
    if (!bounds) throw new Error('Overlay background has no pixel bounds.')
    const inside = {
      x: Math.round(bounds.x + 32),
      y: Math.round(bounds.y + 32),
      width: Math.round(bounds.width - 64),
      height: Math.round(bounds.height - 64),
    }
    // The opaque text strip is above the checkerboard sample, so its glyphs
    // cannot make the background-softening measurement pass or fail.
    expect(textSample.y + textSample.height).toBeLessThanOrEqual(inside.y)
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
    const blurredPng = await page.screenshot({ animations: 'disabled' })
    const blurred = decodePng(blurredPng)
    await testInfo.attach('unblurred', { body: unblurredPng, contentType: 'image/png' })
    await testInfo.attach('blurred', { body: blurredPng, contentType: 'image/png' })

    expect(edgeEnergy(unblurred, inside)).toBeGreaterThan(12)
    expect(edgeEnergy(blurred, inside)).toBeLessThan(edgeEnergy(unblurred, inside) * 0.65)
    expect(meanPixelDifference(unblurred, blurred, outside)).toBeLessThan(0.1)
    // Compositing the backdrop changes Linux glyph antialiasing, even when the
    // foreground remains sharp. Require painted edges, stable bounds and edge
    // contrast instead of identical subpixel colors. A blurred or blank probe fails.
    const textEnergy = edgeEnergy(unblurred, textSample)
    expect(textEnergy).toBeGreaterThan(2)
    expect(await readabilityProbe.boundingBox()).toEqual(textBounds)
    expect(edgeEnergy(blurred, textSample)).toBeGreaterThan(textEnergy * 0.95)
    expect(edgeEnergy(blurred, textSample)).toBeLessThan(textEnergy * 1.05)
  })
})
