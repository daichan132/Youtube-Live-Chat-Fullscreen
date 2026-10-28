import { type Extension, expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
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

test.afterEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
})

test('rechecks a stationary caption when resizing brings an unpinned chat into it', async ({ page, extension }) => {
  await page.setViewportSize({ width: 500, height: 500 })
  const initialGeometry = {
    reference: 'player' as const,
    rect: { x: 50 / 500, y: 50 / 500, width: 240 / 500, height: 180 / 500 },
    pinned: false,
  }
  await patchOverlayStore(extension, {
    geometry: initialGeometry,
    profile: { display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
  })
  const scenario = new YouTubeScenario(page)
  await scenario.load(state)
  await scenario.addCaptionObstacle({ x: 300, y: 50, width: 200, height: 200 })
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 50, y: 50, width: 240, height: 180 })
  const caption = page.locator('[data-fixture-caption]')
  const initialCaption = await caption.boundingBox()
  expect(initialCaption).toMatchObject({ x: 300, y: 50, width: 200, height: 200 })

  await page.setViewportSize({ width: 800, height: 800 })

  await expect.poll(() => caption.boundingBox()).toEqual(initialCaption)
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 10, y: 502, width: 384, height: 288 })
  await expect
    .poll(async () => {
      const stored = (await extension.storage.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY] as { value: { pinned: boolean } }
      return stored.value.pinned
    })
    .toBe(false)
})

test('moves an unpinned chat when a hidden player menu appears', async ({ page, extension }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  const initialGeometry = {
    reference: 'player' as const,
    rect: { x: 10 / 1280, y: 10 / 720, width: 300 / 1280, height: 200 / 720 },
    pinned: false,
  }
  await patchOverlayStore(extension, {
    geometry: initialGeometry,
    profile: { display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
  })
  const scenario = new YouTubeScenario(page)
  await scenario.load(state)
  await page.evaluate(() => {
    const player = document.getElementById('movie_player')
    if (!player) throw new Error('Fixture player is missing.')
    const style = document.createElement('style')
    style.textContent = '.ytp-settings-menu-hidden { display: none; }'
    const menu = document.createElement('div')
    menu.className = 'ytp-popup ytp-settings-menu-hidden'
    menu.dataset.fixtureMenu = 'true'
    menu.style.cssText = 'position: absolute; left: 0; top: 0; width: 500px; height: 400px;'
    player.append(style, menu)
  })
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  const menu = page.locator('[data-fixture-menu]')
  await expect(menu).toBeHidden()
  await expect.poll(() => overlay.getGeometry()).toMatchObject({ x: 10, y: 10, width: 300, height: 200 })
  const initialChat = await overlay.getGeometry()
  expect(((await extension.storage.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY] as { value: unknown }).value).toEqual(initialGeometry)

  await menu.evaluate(element => element.classList.remove('ytp-settings-menu-hidden'))
  await expect(menu).toBeVisible()
  const shownMenu = await menu.boundingBox()
  expect(shownMenu).toMatchObject({ x: 0, y: 0, width: 500, height: 400 })
  if (!shownMenu) throw new Error('The visible fixture menu must have bounds.')
  expect(initialChat.x).toBeLessThan(shownMenu.x + shownMenu.width)
  expect(initialChat.x + initialChat.width).toBeGreaterThan(shownMenu.x)
  expect(initialChat.y).toBeLessThan(shownMenu.y + shownMenu.height)
  expect(initialChat.y + initialChat.height).toBeGreaterThan(shownMenu.y)
  await expect.poll(async () => {
    const [chat, obstacle] = await Promise.all([overlay.frame().boundingBox(), menu.boundingBox()])
    if (!chat || !obstacle) return false
    return (
      chat.x + chat.width <= obstacle.x ||
      obstacle.x + obstacle.width <= chat.x ||
      chat.y + chat.height <= obstacle.y ||
      obstacle.y + obstacle.height <= chat.y
    )
  }).toBe(true)

  const chat = await overlay.getGeometry()
  expect(chat.y).toBeGreaterThan(10)
  for (let sample = 0; sample < 3; sample += 1) {
    await page.waitForTimeout(150)
    expect(await overlay.getGeometry()).toEqual(chat)
  }
  await expect(async () => {
    const stored = (await extension.storage.get(GEOMETRY_STORAGE_KEY))[GEOMETRY_STORAGE_KEY] as {
      value: { reference: string; pinned: boolean; rect: { x: number; y: number; width: number; height: number } }
    }
    expect(stored.value).toMatchObject({ reference: 'player', pinned: false })
    expect(stored.value.rect.x).toBeCloseTo(chat.x / 1280, 4)
    expect(stored.value.rect.y).toBeCloseTo(chat.y / 720, 4)
  }).toPass()
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
  test(`repeats ${label} while held and stops after pointer release`, async ({ page, extension }) => {
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
    try {
      await expect.poll(async () => ((await overlay.getGeometry())[axis] - initial[axis]) * direction).toBeGreaterThanOrEqual(30)
    } finally {
      await page.mouse.up()
    }
    // A timer may fire while the release command travels to the browser.
    // Controlled-clock DOM tests separately pin the absence of a release click.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
    const released = await overlay.getGeometry()
    await page.waitForTimeout(200)
    expect(await overlay.getGeometry()).toEqual(released)
    for (const other of ['x', 'y', 'width', 'height'] as const) if (other !== axis) expect(released[other]).toBe(initial[other])
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
    try {
      await expect.poll(async () => (await overlay.getGeometry()).x).toBeGreaterThanOrEqual(340)
    } finally {
      await page.keyboard.up(key)
    }
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())))
    const released = await overlay.getGeometry()
    await page.waitForTimeout(200)
    expect(await overlay.getGeometry()).toEqual(released)
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
