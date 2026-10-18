import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page } from '@playwright/test'
import { GEOMETRY_STORAGE_KEY, LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '../../../shared/settings/storageKeys'

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

for (const variant of [
  { theme: 'light', viewport: { width: 1280, height: 720 } },
  { theme: 'dark', viewport: { width: 1280, height: 720 } },
  { theme: 'dark', viewport: { width: 320, height: 240 } },
] as const) {
  test(`placement design mirrors physical directions in ${variant.theme} ${variant.viewport.width}px`, async ({ page, extension }, testInfo) => {
    await setup(page, extension, variant.viewport, { width: 300, height: variant.viewport.height > 240 ? 540 : 150 })
    await extension.storage.set({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'placement-design', value: 'ja' },
      [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'placement-design', value: variant.theme },
    })
    await page.locator('[data-ylc-placement-button]').click()
    const panel = page.locator('[data-ylc-placement-panel]')
    await expect(panel).toHaveAttribute('aria-label', '配置調整')
    await expect(async () => {
      const snapshot = await panel.evaluate(el => ({
        y: el.getBoundingClientRect().y,
        height: el.getBoundingClientRect().height,
        maxHeight: getComputedStyle(el).maxHeight,
        marginBottom: getComputedStyle(el).marginBottom,
        railTop: el.parentElement?.getBoundingClientRect().top,
        railTransform: el.parentElement ? getComputedStyle(el.parentElement).transform : '',
      }))
      expect(snapshot.y, JSON.stringify(snapshot)).toBeGreaterThanOrEqual(0)
    }).toPass({ timeout: 2000 })
    const rect = await panel.boundingBox()
    if (!rect) throw new Error('Placement panel is missing.')
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(variant.viewport.width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(variant.viewport.height)
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    const bounds = async (name: string) => {
      const box = await panel.getByRole('button', { name, exact: true }).boundingBox()
      if (!box) throw new Error('Directional button is missing.')
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }
    const up = await bounds('上へ'), down = await bounds('下へ'), left = await bounds('左へ'), right = await bounds('右へ')
    expect(up.y).toBeLessThan(left.y)
    expect(down.y).toBeGreaterThan(left.y)
    expect(left.x).toBeLessThan(up.x)
    expect(right.x).toBeGreaterThan(up.x)
    expect(left.y).toBeCloseTo(right.y, 0)
    expect(up.x).toBeCloseTo(down.x, 0)
    for (const label of ['上へ', '下へ', '左へ', '右へ', '幅を減らす', '幅を増やす', '高さを減らす', '高さを増やす']) {
      await expect(panel.getByRole('button', { name: label, exact: true }).locator('svg')).toHaveAttribute('aria-hidden', 'true')
    }
    await testInfo.attach('placement-design', { body: await page.screenshot(), contentType: 'image/png' })
    await panel.screenshot({ path: testInfo.outputPath(`placement-${variant.theme}-${variant.viewport.width}.png`) })
    await panel.getByRole('button', { name: '閉じる', exact: true }).click()
    await expect(panel).toHaveCount(0)
    await expect(page.locator('[data-ylc-placement-button]')).toBeFocused()
  })
}

for (const [label, axis, direction] of [
  ['Move up', 'y', -1], ['Move down', 'y', 1],
  ['Move left', 'x', -1], ['Move right', 'x', 1],
  ['Decrease width', 'width', -1], ['Increase width', 'width', 1],
  ['Decrease height', 'height', -1], ['Increase height', 'height', 1],
] as const) {
  test(`repeats ${label} while held and stops without a release step`, async ({ page, extension }) => {
    await setup(page, extension)
    await patchOverlayStore(extension, {
      geometry: { reference: 'player', rect: { x: 300 / 1280, y: 180 / 720, width: 400 / 1280, height: 360 / 720 }, pinned: true },
    })
    const overlay = new ExtensionOverlay(page)
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 300, y: 180, width: 400, height: 360 })
    await overlay.revealControls()
    await page.locator('[data-ylc-placement-button]').click()
    const button = page.locator('[data-ylc-placement-panel]').getByRole('button', { name: label, exact: true })
    await button.click()
    const initial = { x: 300, y: 180, width: 400, height: 360 }
    initial[axis] += direction * 10
    await expect.poll(() => overlay.getGeometry()).toMatchObject(initial)
    await button.hover()
    await page.mouse.down()
    let held = initial
    try {
      await expect.poll(async () => ((await overlay.getGeometry())[axis] - initial[axis]) * direction).toBeGreaterThanOrEqual(30)
      held = await overlay.getGeometry()
    } finally {
      await page.mouse.up()
    }
    expect(await overlay.getGeometry()).toEqual(held)
    await page.waitForTimeout(200)
    expect(await overlay.getGeometry()).toEqual(held)
    for (const other of ['x', 'y', 'width', 'height'] as const) if (other !== axis) expect(held[other]).toBe(initial[other])
  })
}

for (const key of ['Enter', 'Space']) {
  test(`repeats a focused adjustment with held ${key} and stops on key release`, async ({ page, extension }) => {
    await setup(page, extension)
    await patchOverlayStore(extension, {
      geometry: { reference: 'player', rect: { x: 300 / 1280, y: 180 / 720, width: 400 / 1280, height: 360 / 720 }, pinned: true },
    })
    const overlay = new ExtensionOverlay(page)
    await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 300, y: 180, width: 400, height: 360 })
    await overlay.revealControls()
    await page.locator('[data-ylc-placement-button]').click()
    await page.locator('[data-ylc-placement-panel]').getByRole('button', { name: 'Move right', exact: true }).focus()
    await page.keyboard.down(key)
    let held = await overlay.getGeometry()
    try {
      await expect.poll(async () => (await overlay.getGeometry()).x).toBeGreaterThanOrEqual(340)
      held = await overlay.getGeometry()
    } finally {
      await page.keyboard.up(key)
    }
    expect(await overlay.getGeometry()).toEqual(held)
    await page.waitForTimeout(200)
    expect(await overlay.getGeometry()).toEqual(held)
  })
}

test('disables each limit direction, stops holding there, and restores availability in the opposite direction', async ({ page, extension }) => {
  await setup(page, extension)
  const overlay = new ExtensionOverlay(page)
  for (const scenario of [
    { action: 'Move up', opposite: 'Move down', layout: { x: 300, y: 20, width: 400, height: 300 }, end: { y: 10 } },
    { action: 'Move down', opposite: 'Move up', layout: { x: 300, y: 400, width: 400, height: 300 }, end: { y: 410 } },
    { action: 'Move left', opposite: 'Move right', layout: { x: 20, y: 180, width: 400, height: 300 }, end: { x: 10 } },
    { action: 'Move right', opposite: 'Move left', layout: { x: 860, y: 180, width: 400, height: 300 }, end: { x: 870 } },
    { action: 'Decrease width', opposite: 'Increase width', layout: { x: 300, y: 180, width: 250, height: 300 }, end: { width: 240 } },
    { action: 'Increase width', opposite: 'Decrease width', layout: { x: 100, y: 100, width: 822, height: 300 }, end: { width: 832 } },
    { action: 'Decrease height', opposite: 'Increase height', layout: { x: 300, y: 180, width: 400, height: 190 }, end: { height: 180 } },
    { action: 'Increase height', opposite: 'Decrease height', layout: { x: 100, y: 10, width: 400, height: 638 }, end: { height: 648 } },
  ]) {
    const { x, y, width, height } = scenario.layout
    await patchOverlayStore(extension, { geometry: { reference: 'player', rect: { x: x / 1280, y: y / 720, width: width / 1280, height: height / 720 }, pinned: true } })
    await expect.poll(() => overlay.getGeometry()).toMatchObject(scenario.layout)
    await overlay.revealControls()
    await page.locator('[data-ylc-placement-button]').click()
    const panel = page.locator('[data-ylc-placement-panel]')
    const button = panel.getByRole('button', { name: scenario.action, exact: true })
    await expect(button).toBeEnabled()
    await button.hover()
    await page.mouse.down()
    try { await expect(button).toBeDisabled() } finally { await page.mouse.up() }
    await expect(button).toHaveCSS('opacity', '0.38')
    const expected = { ...scenario.layout, ...scenario.end }
    await expect.poll(() => overlay.getGeometry()).toMatchObject(expected)
    await page.waitForTimeout(200)
    expect(await overlay.getGeometry()).toMatchObject(expected)
    await panel.getByRole('button', { name: scenario.opposite, exact: true }).click()
    await expect(button).toBeEnabled()
    await page.locator('[data-ylc-placement-button]').click()
  }
})

test('restores the opening position and size and captures a fresh baseline after reopening', async ({ page, extension }) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 400, height: 400 }, { x: 300, y: 180 })
  const overlay = new ExtensionOverlay(page)
  const original = await overlay.getGeometry()
  const originalStored = await extension.storage.get(GEOMETRY_STORAGE_KEY)
  const placement = page.locator('[data-ylc-placement-button]')
  const panel = page.locator('[data-ylc-placement-panel]')
  const restore = panel.getByRole('button', { name: 'Restore previous layout', exact: true })
  await placement.click()
  await expect(restore).toBeDisabled()
  await panel.getByRole('button', { name: 'Move right', exact: true }).click()
  await panel.getByRole('button', { name: 'Decrease height', exact: true }).click()
  await expect(restore).toBeEnabled()
  await restore.click()
  await expect.poll(() => overlay.getGeometry()).toMatchObject(original)
  await expect(restore).toBeDisabled()
  const restored = await extension.storage.get(GEOMETRY_STORAGE_KEY)
  expect((restored[GEOMETRY_STORAGE_KEY] as { value: unknown }).value).toEqual((originalStored[GEOMETRY_STORAGE_KEY] as { value: unknown }).value)
  await panel.getByRole('button', { name: 'Move right', exact: true }).click()
  const second = { ...original, x: original.x + 10 }
  await expect.poll(() => overlay.getGeometry()).toMatchObject(second)
  await placement.click()
  await placement.click()
  await expect(restore).toBeDisabled()
  await panel.getByRole('button', { name: 'Move down', exact: true }).click()
  await restore.click()
  await expect.poll(() => overlay.getGeometry()).toMatchObject(second)
})
