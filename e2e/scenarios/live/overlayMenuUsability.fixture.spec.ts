import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page } from '@playwright/test'
import { GEOMETRY_STORAGE_KEY, LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const state = {
  video: { id: 'local-overlay-menu', title: 'Local overlay controls', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', purchaseInteractions: true, native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

const setup = async (
  page: Page,
  extension: Extension,
  viewport = { width: 1280, height: 720 },
  panelSize = { width: 240, height: 180 },
  coordinates = { x: 10, y: 10 },
) => {
  await page.setViewportSize(viewport)
  await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'menu-usability', value: 'en' } })
  await patchOverlayStore(extension, {
    geometry: {
      reference: 'player',
      rect: {
        x: coordinates.x / viewport.width,
        y: coordinates.y / viewport.height,
        width: panelSize.width / viewport.width,
        height: panelSize.height / viewport.height,
      },
      pinned: true,
    },
    profile: { display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
  })
  const scenario = new YouTubeScenario(page)
  await scenario.load(state)
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  await overlay.revealControls()
}

const controls = [
  ['[data-ylc-settings-btn]', 'Open settings'],
  ['[data-ylc-drag-handle]', 'Drag to move'],
  ['[data-ylc-placement-button]', 'Adjust position and size'],
] as const

const expectTooltipAtButton = async (page: Page, button: Locator, side: 'bottom' | 'top', viewport = { width: 1280, height: 720 }) => {
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await expect(tooltip).toHaveAttribute('data-ylc-tooltip-side', side)
  await expect(async () => {
    const [help, target, rail] = await Promise.all([
      tooltip.boundingBox(),
      button.boundingBox(),
      page.locator('[data-ylc-control-rail]').boundingBox(),
    ])
    if (!help || !target || !rail) throw new Error('Tooltip, active button and rail need visible browser bounds.')
    const center = target.x + target.width / 2
    const centeredLeft = center - help.width / 2
    const expectedLeft = Math.max(8, Math.min(centeredLeft, viewport.width - 8 - help.width))
    // offsetWidth/offsetHeight used for scale-independent layout round to a
    // CSS pixel; the painted DOMRect can retain fractional font metrics.
    expect(Math.abs(help.x - expectedLeft)).toBeLessThanOrEqual(1)
    expect(center).toBeGreaterThanOrEqual(help.x - 0.1)
    expect(center).toBeLessThanOrEqual(help.x + help.width + 0.1)
    expect(help.x).toBeGreaterThanOrEqual(7.9)
    expect(help.x + help.width).toBeLessThanOrEqual(viewport.width - 7.9)
    expect(help.y).toBeGreaterThanOrEqual(7.9)
    expect(help.y + help.height).toBeLessThanOrEqual(viewport.height - 7.9)
    if (side === 'bottom') expect(Math.abs(help.y - (rail.y + rail.height + 6))).toBeLessThanOrEqual(1)
    else expect(Math.abs(help.y + help.height - (rail.y - 6))).toBeLessThanOrEqual(1)
    expect(await tooltip.evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none')
  }).toPass({ timeout: 3000 })
}

test.afterEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
})

test('dismisses placement with the ordinary player click and preserves that click', async ({ page, extension }) => {
  await setup(page, extension)
  await page.evaluate(() => {
    const target = document.querySelector('[data-ylc-player-boundary-probe]')
    target?.setAttribute('data-clicks', '0')
    target?.addEventListener('click', () => target.setAttribute('data-clicks', String(Number(target.getAttribute('data-clicks')) + 1)))
  })
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  await expect(placement).toHaveAttribute('aria-expanded', 'true')
  await page.locator('[data-ylc-player-boundary-probe]').click()
  await expect(placement).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-ylc-player-boundary-probe]')).toHaveAttribute('data-clicks', '1')
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
})

test('dismisses from the borrowed chat without blocking an unsent composer draft', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 480, height: 360 })
  const saved = await extension.storage.get(GEOMETRY_STORAGE_KEY)
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  const composer = page.frameLocator('iframe[data-ylc-chat]').locator('[aria-label="Chat draft"]')
  await composer.click({ position: { x: 12, y: 8 } })
  await expect(placement).toHaveAttribute('aria-expanded', 'false')
  await expect(composer).toBeFocused()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.type('hello')
  await expect(composer).toHaveText('hello')
  const counters = await composer.evaluate(
    element =>
      (
        element.ownerDocument.defaultView as Window & {
          __ylcFixturePurchase?: Record<string, number>
        }
      ).__ylcFixturePurchase,
  )
  expect(counters).toEqual({
    supportEntries: 0,
    superChatEntries: 0,
    membershipEntries: 0,
    preventedEntries: 0,
    trustedEntries: 0,
    windowOpenCalls: 0,
    confirmations: 0,
  })
  expect(await extension.storage.get(GEOMETRY_STORAGE_KEY)).toEqual(saved)
  await testInfo.attach('dismissed-unsent-composer', { body: await page.screenshot(), contentType: 'image/png' })
})

test('does not resurrect the placement menu after opening and closing settings', async ({ page, extension }) => {
  await setup(page, extension)
  await page.locator('[data-ylc-placement-button]').click()
  await page.locator('[data-ylc-settings-btn]').click()
  const settings = page.frameLocator('[data-ylc-settings-frame]')
  await settings.locator('[data-ylc-setting-close-button]').click()
  await expect(page.locator('[data-ylc-settings-frame]')).toHaveCount(0)
  await expect(page.locator('[data-ylc-placement-button]')).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-ylc-placement-panel]')).toHaveCount(0)
})

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 320, height: 240 },
]) {
  test(`keeps localized hover help inside the ${viewport.width}x${viewport.height} player`, async ({ page, extension }, testInfo) => {
    await setup(page, extension, viewport)
    const tooltip = page.locator('[data-ylc-control-tooltip]')
    for (const [selector, label] of controls) {
      await page.locator(selector).hover()
      await expect(tooltip).toContainText(label)
      await expectTooltipAtButton(page, page.locator(selector), viewport.height === 240 ? 'top' : 'bottom', viewport)
    }
    await testInfo.attach('hover-help', { body: await page.screenshot(), contentType: 'image/png' })
    await page.locator('[data-ylc-placement-button]').click()
    await expect(tooltip).toHaveCount(0)
  })
}

for (const edge of [
  { name: 'left', x: 10 },
  { name: 'right', x: 1030 },
]) {
  test(`anchors each icon tooltip below its own button at the ${edge.name} player edge`, async ({ page, extension }, testInfo) => {
    await setup(page, extension, { width: 1280, height: 720 }, { width: 240, height: 180 }, { x: edge.x, y: 10 })
    const tooltip = page.locator('[data-ylc-control-tooltip]')
    for (const [selector, label] of controls) {
      const button = page.locator(selector)
      await button.hover()
      await expect(tooltip).toContainText(label)
      await expectTooltipAtButton(page, button, 'bottom')
      await testInfo.attach(`${edge.name}-edge-${label}`, { body: await page.screenshot(), contentType: 'image/png' })
    }
  })
}

test('flips tooltip above the rail at the bottom player edge', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 240, height: 180 }, { x: 100, y: 530 })
  const drag = page.locator('[data-ylc-drag-handle]')
  await drag.hover()
  await expect(page.locator('[data-ylc-control-tooltip]')).toContainText('Use arrow keys to move')
  await expectTooltipAtButton(page, drag, 'top')
  await testInfo.attach('bottom-edge-tooltip', { body: await page.screenshot(), contentType: 'image/png' })
})

test('tracks the focused tooltip when arrow keys move the control rail', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 400, height: 300 }, { x: 100, y: 80 })
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  await placement.click()
  await page.mouse.move(1200, 30)
  await page.keyboard.press('Shift+Tab')
  const drag = page.locator('[data-ylc-drag-handle]')
  await expect(drag).toBeFocused()
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await expect(tooltip).toContainText('Use arrow keys to move')
  await expectTooltipAtButton(page, drag, 'bottom')
  const before = await tooltip.boundingBox()
  if (!before) throw new Error('Expected visible keyboard tooltip before movement.')
  await testInfo.attach('keyboard-tooltip-before', { body: await page.screenshot(), contentType: 'image/png' })

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')

  await expect(drag).toBeFocused()
  await expectTooltipAtButton(page, drag, 'bottom')
  await expect(async () => {
    const after = await tooltip.boundingBox()
    if (!after) throw new Error('Keyboard help must remain mounted after movement.')
    expect(after.x - before.x).toBeCloseTo(10, 1)
    expect(after.y - before.y).toBeCloseTo(10, 1)
  }).toPass({ timeout: 3000 })
  const overlay = new ExtensionOverlay(page)
  expect(await overlay.getGeometry()).toMatchObject({ x: 110, y: 90, width: 400, height: 300 })
  await testInfo.attach('keyboard-tooltip-after', { body: await page.screenshot(), contentType: 'image/png' })
  const saved = (await extension.storage.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY] as {
    value: { pinned: boolean; rect: { x: number; y: number } }
  }
  expect(saved.value.pinned).toBe(true)
  expect(saved.value.rect.x).toBeCloseTo(110 / 1280, 8)
  expect(saved.value.rect.y).toBeCloseTo(90 / 720, 8)
})

test('updates help when keyboard focus leaves a button under the stationary pointer', async ({ page, extension }, testInfo) => {
  await setup(page, extension)
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  await placement.click()
  await page.locator('[data-ylc-settings-btn]').hover()
  await expect(page.locator('[data-ylc-control-tooltip]')).toContainText('Open settings')
  await page.keyboard.press('Shift+Tab')
  await expect(page.locator('[data-ylc-drag-handle]')).toBeFocused()
  await expect(page.locator('[data-ylc-control-tooltip]')).toContainText('Use arrow keys to move')
  await testInfo.attach('keyboard-help', { body: await page.screenshot(), contentType: 'image/png' })
})

test('keeps hover help in the configured chat palette across live appearance changes', async ({ page, extension }, testInfo) => {
  await setup(page, extension)
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  for (const palette of [
    {
      name: 'teal', backgroundColor: { r: 12, g: 34, b: 44, a: 0.2 }, fontColor: { r: 216, g: 247, b: 232, a: 1 },
      background: 'rgba(12, 34, 44, 0.94)', text: 'rgb(216, 247, 232)', border: 'rgba(216, 247, 232, 0.18)',
    },
    {
      name: 'cream', backgroundColor: { r: 248, g: 236, b: 214, a: 1 }, fontColor: { r: 70, g: 40, b: 30, a: 0.9 },
      background: 'rgb(248, 236, 214)', text: 'rgba(70, 40, 30, 0.9)', border: 'rgba(70, 40, 30, 0.18)',
    },
    {
      name: 'violet', backgroundColor: { r: 48, g: 20, b: 64, a: 0.98 }, fontColor: { r: 250, g: 224, b: 255, a: 1 },
      background: 'rgba(48, 20, 64, 0.98)', text: 'rgb(250, 224, 255)', border: 'rgba(250, 224, 255, 0.18)',
    },
  ]) {
    await page.locator('[data-ylc-settings-btn]').hover()
    await expect(tooltip).toBeVisible()
    await patchOverlayStore(extension, { profile: { appearance: { backgroundColor: palette.backgroundColor, fontColor: palette.fontColor } } })
    // The already-open tooltip must update before moving to another control.
    await expect(tooltip).toHaveCSS('background-color', palette.background)
    await expect(tooltip).toHaveCSS('color', palette.text)
    await expect(tooltip).toHaveCSS('border-top-color', palette.border)
    await expect(tooltip).toHaveCSS('pointer-events', 'none')
    await testInfo.attach(`tooltip-${palette.name}`, { body: await page.screenshot(), contentType: 'image/png' })
    await tooltip.screenshot({ path: testInfo.outputPath(`tooltip-${palette.name}.png`) })
    for (const selector of ['[data-ylc-drag-handle]', '[data-ylc-placement-button]']) {
      await page.locator(selector).hover()
      await expect(tooltip).toHaveCSS('background-color', palette.background)
      await expect(tooltip).toHaveCSS('color', palette.text)
    }
  }
})
