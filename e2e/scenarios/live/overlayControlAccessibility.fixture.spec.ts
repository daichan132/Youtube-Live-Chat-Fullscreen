import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import { THEME_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const state = {
  video: { id: 'overlay-control-accessibility', title: 'Overlay control accessibility fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

type Color = [number, number, number, number]
const parseColor = (value: string): Color => {
  const values = value.match(/[\d.]+/g)?.map(Number)
  if (!values || values.length < 3) throw new Error(`Expected an RGB color, received ${value}`)
  const [r = 0, g = 0, b = 0, a = 1] = values
  return [r, g, b, a]
}
const composite = (foreground: Color, background: Color): Color => [
  foreground[0] * foreground[3] + background[0] * (1 - foreground[3]),
  foreground[1] * foreground[3] + background[1] * (1 - foreground[3]),
  foreground[2] * foreground[3] + background[2] * (1 - foreground[3]),
  1,
]
const luminance = (color: Color) => {
  const linear = (value: number) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return linear(color[0]) * 0.2126 + linear(color[1]) * 0.7152 + linear(color[2]) * 0.0722
}
const contrast = (foreground: Color, background: Color) => {
  const values = [luminance(foreground), luminance(background)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

for (const theme of ['light', 'dark'] as const) {
  test(`follows readable chat palettes and keeps recovery controls operable with unreadable colors in ${theme}`, async ({
    page,
    extension,
  }, testInfo) => {
    await extension.storage.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'control-accessibility', value: theme } })
    await patchOverlayStore(extension, {
      geometry: { reference: 'player', rect: { x: 0.1, y: 0.1, width: 0.4, height: 0.5 }, pinned: true },
      profile: { display: { idleVisibility: 'always-visible' } },
    })
    const scenario = new YouTubeScenario(page)
    await scenario.load(state)
    await scenario.enterFullscreen()
    const overlay = new ExtensionOverlay(page)
    await overlay.expectChatLoaded({ timeout: 12000 })
    await expect(page.locator('[data-ylc-overlay-container]')).toHaveAttribute('data-ylc-theme', theme)
    const rail = page.locator('[data-ylc-control-rail]')
    const settings = page.locator('[data-ylc-settings-btn]')
    const drag = page.locator('[data-ylc-drag-handle]')
    const placement = page.locator('[data-ylc-placement-button]')

    for (const palette of [
      {
        name: 'navy',
        backgroundColor: { r: 24, g: 32, b: 52, a: 1 },
        fontColor: { r: 224, g: 232, b: 248, a: 1 },
        expectedInk: 'rgb(224, 232, 248)',
        expectedSurface: 'rgb(24, 32, 52)',
      },
      {
        name: 'warm',
        backgroundColor: { r: 248, g: 237, b: 218, a: 1 },
        fontColor: { r: 72, g: 45, b: 31, a: 1 },
        expectedInk: 'rgb(72, 45, 31)',
        expectedSurface: 'rgb(248, 237, 218)',
      },
      ...[1, 0].map(alpha => ({
        name: `white-${alpha}`,
        backgroundColor: { r: 255, g: 255, b: 255, a: alpha },
        fontColor: { r: 255, g: 255, b: 255, a: alpha },
        expectedInk: 'rgb(0, 0, 0)',
        expectedSurface: 'rgb(255, 255, 255)',
      })),
    ]) {
      await patchOverlayStore(extension, {
        profile: {
          appearance: {
            backgroundColor: palette.backgroundColor,
            fontColor: palette.fontColor,
          },
        },
      })
      await expect(rail).toHaveCSS('background-color', palette.expectedSurface)
      await expect(settings.locator('svg')).toHaveCSS('color', palette.expectedInk)
      await page.mouse.move(1, 1)
      for (let step = 0; step < 40 && !(await settings.evaluate(element => element.matches(':focus'))); step += 1) {
        await page.keyboard.press('Tab')
      }
      await expect(settings).toBeFocused()
      await expect(rail).toHaveCSS('opacity', '1')

      // Test rendered control colors against both the lightest and darkest
      // possible video backdrops beneath the translucent rail.
      await expect(async () => {
        const background = parseColor(await rail.evaluate(element => getComputedStyle(element).backgroundColor))
        for (const button of [settings, drag, placement]) {
          const foreground = parseColor(await button.locator('svg').evaluate(element => getComputedStyle(element).color))
          for (const value of [0, 255]) {
            const paintedBackground = composite(background, [value, value, value, 1])
            expect(contrast(composite(foreground, paintedBackground), paintedBackground)).toBeGreaterThanOrEqual(3)
          }
        }
      }).toPass({ timeout: 3000 })

      for (const button of [settings, drag, placement]) {
        await button.hover()
        const expectedHover = palette.expectedInk.replace('rgb(', 'rgba(').replace(')', ', 0.1)')
        await expect(button).toHaveCSS('background-color', expectedHover)
        const background = parseColor(await rail.evaluate(element => getComputedStyle(element).backgroundColor))
        const hover = parseColor(await button.evaluate(element => getComputedStyle(element).backgroundColor))
        const ink = parseColor(await button.locator('svg').evaluate(element => getComputedStyle(element).color))
        for (const value of [0, 255]) {
          const surface = composite(hover, composite(background, [value, value, value, 1]))
          expect(contrast(ink, surface)).toBeGreaterThanOrEqual(3)
        }
      }
      await page.mouse.move(1, 1)

      await expect(settings).toHaveCSS('outline-style', 'solid')
      await page.keyboard.press('Tab')
      await expect(drag).toBeFocused()
      await expect(drag).toHaveCSS('outline-style', 'solid')
      const before = await overlay.getGeometry()
      await page.keyboard.press('ArrowRight')
      await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: before.x + 10, y: before.y })
      await expect(drag).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(placement).toBeFocused()
      await expect(placement).toHaveCSS('outline-style', 'solid')
      await page.keyboard.press('Enter')
      await expect(page.locator('[data-ylc-placement-panel]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(placement).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Enter')
      await expect(overlay.settingsDialog()).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(overlay.settingsDialog()).toHaveCount(0)
      await expect(settings).toBeFocused()
      await page.screenshot({ path: testInfo.outputPath(`chat-controls-${theme}-${palette.name}.png`) })
      const screenshotPath = testInfo.outputPath(`recovery-controls-${theme}-${palette.name}.png`)
      await rail.screenshot({ path: screenshotPath })
      await testInfo.attach(`recovery-controls-${theme}-${palette.name}`, { path: screenshotPath, contentType: 'image/png' })
    }
  })
}
