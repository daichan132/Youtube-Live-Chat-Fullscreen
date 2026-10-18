import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page } from '@playwright/test'

type Layout = { x: number; y: number; width: number; height: number }
const initial: Layout = { x: 100, y: 80, width: 400, height: 300 }
const scenarioState = {
  video: { id: 'overlay-controls-usability', title: 'Overlay controls usability fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

const setup = async (page: Page, extension: Extension, layout = initial, viewport = { width: 1280, height: 720 }) => {
  await page.setViewportSize(viewport)
  await patchOverlayStore(extension, {
    geometry: {
      reference: 'player',
      rect: { x: layout.x / 1280, y: layout.y / 720, width: layout.width / 1280, height: layout.height / 720 },
      pinned: true,
    },
  })
  const scenario = new YouTubeScenario(page)
  await scenario.load(scenarioState)
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  await overlay.revealControls()
  return overlay
}

const boundsOf = async (locator: Locator) => {
  const bounds = await locator.boundingBox()
  if (!bounds) throw new Error('A visible overlay control must have browser bounds.')
  return bounds
}

const expectStationary = async (panel: Locator, anchor: Awaited<ReturnType<typeof boundsOf>>) => {
  const bounds = await boundsOf(panel)
  expect(bounds.x).toBeCloseTo(anchor.x, 1)
  expect(bounds.y).toBeCloseTo(anchor.y, 1)
  expect(bounds.width).toBeCloseTo(anchor.width, 1)
  expect(bounds.height).toBeCloseTo(anchor.height, 1)
}

const expectRailFollows = async (page: Page, layout: Layout) => {
  await expect(async () => {
    const rail = await boundsOf(page.locator('[data-ylc-control-rail]'))
    // These seeded cases retain room below the panel throughout adjustment.
    expect(rail.y).toBeCloseTo(layout.y + layout.height + 6, 1)
    expect(rail.x + rail.width).toBeCloseTo(layout.x + layout.width, 1)
  }).toPass({ timeout: 3000 })
}

test('keeps both first-row placement actions above resize handles in a 480x320 player', async ({ page, extension }) => {
  const overlay = await setup(page, extension, initial, { width: 480, height: 320 })
  await page.locator('[data-ylc-placement-button]').click({ timeout: 3000 })
  const panel = page.locator('[data-ylc-placement-panel]')
  await expect(panel).toBeVisible()
  for (const [action, delta] of [
    ['Move up', -10],
    ['Move down', 10],
  ] as const) {
    const before = await overlay.getGeometry()
    const button = await boundsOf(panel.getByRole('button', { name: action, exact: true }))
    await page.mouse.move(button.x + button.width / 2, button.y + button.height / 2)
    await page.mouse.down()
    try {
      const capturedResizeHandles = await page
        .locator('[data-ylc-resize-direction]')
        .evaluateAll(elements =>
          elements.filter(element => element.hasPointerCapture(1)).map(element => element.getAttribute('data-ylc-resize-direction')),
        )
      expect(capturedResizeHandles).toEqual([])
    } finally {
      await page.mouse.up()
    }
    await expect
      .poll(() => overlay.getGeometry())
      .toMatchObject({ x: before.x, y: before.y + delta, width: before.width, height: before.height })
  }
})

test('keeps controls off chat when no outside strip fits and opens placement with the keyboard', async ({ page, extension }) => {
  const overlay = await setup(page, extension, initial, { width: 320, height: 240 })
  const rail = page.locator('[data-ylc-control-rail]')
  await overlay.frame().hover()
  await expect(rail).toHaveCSS('opacity', '0')
  await expect(rail).toHaveCSS('pointer-events', 'none')
  await expect
    .poll(() =>
      rail.evaluate(element => {
        const bounds = element.getBoundingClientRect()
        const root = element.getRootNode() as ShadowRoot
        const hit = root.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        return !hit || !element.contains(hit)
      }),
    )
    .toBe(true)

  const settings = page.getByRole('button', { name: 'Open settings', exact: true })
  // The native page/iframe can contribute earlier tab stops; the controls
  // must be reachable without assuming they follow the fullscreen trigger.
  for (let step = 0; step < 8 && !(await settings.evaluate(element => element.matches(':focus'))); step += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(settings).toBeFocused()
  await expect(rail).toHaveCSS('opacity', '1')
  for (const label of ['Drag to move', 'Adjust position and size']) {
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: label, exact: true })).toBeFocused()
    await expect(rail).toHaveCSS('opacity', '1')
  }
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-ylc-placement-panel]')).toBeVisible()
})

test('opens placement with a real click on the outside right strip in a 320x240 player', async ({ page, extension }) => {
  const overlay = await setup(page, extension, initial, { width: 320, height: 240 })
  // This case deliberately uses actual small-viewport coordinates. The shared
  // setup's scaled seed above has no complete outside strip for the rail.
  await patchOverlayStore(extension, {
    geometry: {
      reference: 'player',
      rect: { x: 10 / 320, y: 10 / 240, width: 240 / 320, height: 200 / 240 },
      pinned: true,
    },
  })
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 10, y: 10, width: 240, height: 200 })
  await overlay.revealControls()
  const rail = page.locator('[data-ylc-control-rail]')
  await expect(rail).toHaveAttribute('data-ylc-control-rail-orientation', 'vertical')
  await expect(rail).toHaveCSS('opacity', '1')
  await expect(async () => {
    const bounds = await boundsOf(rail)
    const chat = await overlay.getGeometry()
    expect(bounds.x).toBeCloseTo(chat.x + chat.width + 6, 1)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(316)
    expect(bounds.y).toBeGreaterThanOrEqual(4)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(236)
  }).toPass({ timeout: 3000 })
  await page.locator('[data-ylc-placement-button]').click({ timeout: 3000 })
  const panel = page.locator('[data-ylc-placement-panel]')
  await expect(panel).toBeVisible()
  const anchor = await boundsOf(panel)
  expect(anchor.height).toBeGreaterThanOrEqual(100)
  expect(anchor.x).toBeGreaterThanOrEqual(0)
  expect(anchor.y).toBeGreaterThanOrEqual(0)
  expect(anchor.x + anchor.width).toBeLessThanOrEqual(320)
  expect(anchor.y + anchor.height).toBeLessThanOrEqual(240)
  await panel.getByRole('button', { name: 'Move down', exact: true }).click()
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 10, y: 20, width: 240, height: 200 })
  await expectStationary(panel, anchor)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(page.locator('[data-ylc-placement-button]')).toBeFocused()
})

for (const action of ['Move up', 'Move down', 'Increase width', 'Increase height']) {
  test(`keeps ${action} under ten clicks at one fixed screen coordinate`, async ({ page, extension }) => {
    const overlay = await setup(page, extension)
    await page.locator('[data-ylc-placement-button]').click()
    const panel = page.locator('[data-ylc-placement-panel]')
    const anchor = await boundsOf(panel)
    const button = await boundsOf(panel.getByRole('button', { name: action, exact: true }))
    const point = { x: button.x + button.width / 2, y: button.y + button.height / 2 }
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.click(point.x, point.y)
      const expected = {
        x: initial.x,
        y: action === 'Move up' ? Math.max(10, initial.y - step * 10) : action === 'Move down' ? initial.y + step * 10 : initial.y,
        width: initial.width + (action === 'Increase width' ? step * 10 : 0),
        height: initial.height + (action === 'Increase height' ? step * 10 : 0),
      }
      await expect.poll(() => overlay.getGeometry(), { message: `${action}, click ${step}` }).toMatchObject(expected)
      await expectStationary(panel, anchor)
      await expectRailFollows(page, expected)
    }
  })
}

test('keeps fixed-coordinate adjustments stationary at the width and height limits without changing the other axis', async ({
  page,
  extension,
}) => {
  const overlay = await setup(page, extension, { x: 100, y: 10, width: 822, height: 638 })
  await page.locator('[data-ylc-placement-button]').click()
  const panel = page.locator('[data-ylc-placement-panel]')
  const anchor = await boundsOf(panel)
  for (const action of ['Increase width', 'Increase height']) {
    const button = await boundsOf(panel.getByRole('button', { name: action, exact: true }))
    const point = { x: button.x + button.width / 2, y: button.y + button.height / 2 }
    for (let step = 0; step < 10; step += 1) {
      await page.mouse.click(point.x, point.y)
      const expected = { x: 100, y: 10, width: 832, height: action === 'Increase width' ? 638 : 648 }
      await expect.poll(() => overlay.getGeometry()).toMatchObject(expected)
      await expectStationary(panel, anchor)
      await expectRailFollows(page, expected)
    }
  }
})
