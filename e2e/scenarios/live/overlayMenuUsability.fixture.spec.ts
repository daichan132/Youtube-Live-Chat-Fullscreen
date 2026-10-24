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
      await expectTooltipAtButton(page, page.locator(selector), 'bottom', viewport)
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
      expect(
        await page.locator('[data-ylc-resizable]').evaluate(element => ({
          left: element.parentElement?.scrollLeft,
          top: element.parentElement?.scrollTop,
        })),
      ).toEqual({ left: 0, top: 0 })
      await expect(tooltip).toContainText(label)
      await expectTooltipAtButton(page, button, 'bottom')
      await testInfo.attach(`${edge.name}-edge-${label}`, { body: await page.screenshot(), contentType: 'image/png' })
    }
  })
}

test('keeps tooltip below the outside rail above chat at the bottom player edge', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 240, height: 180 }, { x: 100, y: 530 })
  const overlay = new ExtensionOverlay(page)
  await expect(async () => {
    const rail = await page.locator('[data-ylc-control-rail]').boundingBox()
    if (!rail) throw new Error('Outside controls need visible browser bounds.')
    const chat = await overlay.getGeometry()
    expect(rail.y + rail.height).toBeLessThanOrEqual(chat.y - 6)
  }).toPass({ timeout: 3000 })
  const drag = page.locator('[data-ylc-drag-handle]')
  await drag.hover()
  await expect(page.locator('[data-ylc-control-tooltip]')).toContainText('Use arrow keys to move')
  await expectTooltipAtButton(page, drag, 'bottom')
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

for (const theme of ['light', 'dark'] as const) {
  test(`keeps tooltip contrast independent of custom chat colors in ${theme} mode`, async ({ page, extension }, testInfo) => {
    await setup(page, extension)
    await extension.storage.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'tooltip-contrast', value: theme } })
    const tooltip = page.locator('[data-ylc-control-tooltip]')
    for (const palette of [
      { name: 'white-on-white', backgroundColor: { r: 255, g: 255, b: 255, a: 1 }, fontColor: { r: 255, g: 255, b: 255, a: 1 } },
      { name: 'black-on-black', backgroundColor: { r: 0, g: 0, b: 0, a: 1 }, fontColor: { r: 0, g: 0, b: 0, a: 1 } },
      { name: 'transparent', backgroundColor: { r: 255, g: 0, b: 255, a: 0 }, fontColor: { r: 255, g: 0, b: 255, a: 0 } },
    ]) {
      await page.locator('[data-ylc-settings-btn]').hover()
      await expect(tooltip).toBeVisible()
      await patchOverlayStore(extension, {
        profile: { appearance: { backgroundColor: palette.backgroundColor, fontColor: palette.fontColor } },
      })
      for (const [selector] of controls) {
        await page.locator(selector).hover()
        await expect(tooltip).toBeVisible()
        await expect(async () => {
          const colors = await tooltip.evaluate(element => {
            const style = getComputedStyle(element)
            return { background: style.backgroundColor, text: style.color }
          })
          const rgb = (value: string) => value.match(/[\d.]+/g)?.map(Number) ?? []
          const bg = rgb(colors.background)
          const fg = rgb(colors.text)
          expect(bg[3] ?? 1).toBe(1)
          expect(fg[3] ?? 1).toBe(1)
          const luminance = (channels: number[]) =>
            channels
              .slice(0, 3)
              .map(channel => {
                const value = channel / 255
                return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
              })
              .reduce((sum, value, index) => sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0)
          const values = [luminance(bg), luminance(fg)]
          expect((Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)).toBeGreaterThanOrEqual(4.5)
        }).toPass({ timeout: 3000 })
        await expect(tooltip).toHaveCSS('pointer-events', 'none')
      }
      await testInfo.attach(`tooltip-${theme}-${palette.name}`, { body: await page.screenshot(), contentType: 'image/png' })
    }
    await page.locator('[data-ylc-settings-btn]').click()
    const settings = page.frameLocator('[data-ylc-settings-frame]')
    await expect(settings.locator('[role="dialog"]')).toBeVisible()
    await testInfo.attach(`settings-${theme}`, { body: await page.screenshot(), contentType: 'image/png' })
    await settings.locator('[data-ylc-setting-close-button]').click()
    await expect(page.locator('[data-ylc-settings-frame]')).toHaveCount(0)
  })
}

test('does not retain hover help for a mouse-focused button after the pointer leaves', async ({ page, extension }) => {
  await setup(page, extension)
  const placement = page.locator('[data-ylc-placement-button]')
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await placement.click()
  await placement.click()
  await page.mouse.move(1200, 30)
  await expect(placement).toBeFocused()
  await expect(tooltip).toHaveCount(0)

  // Keyboard navigation still exposes help, even with the pointer elsewhere.
  await page.keyboard.press('Shift+Tab')
  const drag = page.locator('[data-ylc-drag-handle]')
  await expect(drag).toBeFocused()
  await expect(tooltip).toContainText('Use arrow keys to move')
  // Clicking the already-focused button switches back to pointer interaction.
  await drag.click()
  await page.mouse.move(1200, 30)
  await expect(drag).toBeFocused()
  await expect(tooltip).toHaveCount(0)
  // Keyboard use on that same focus target re-enables keyboard help.
  await page.keyboard.press('ArrowRight')
  await expect(tooltip).toContainText('Use arrow keys to move')
})

test('restores trigger focus without reopening hover help after the mouse closes placement', async ({ page, extension }) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 300, height: 540 })
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  await page.locator('[data-ylc-placement-panel]').getByRole('button', { name: 'Close', exact: true }).click()
  await page.mouse.move(1200, 30)
  await expect(placement).toBeFocused()
  await expect(page.locator('[data-ylc-control-tooltip]')).toHaveCount(0)
})

test('waits for a continuous 200ms hover and cancels help when the pointer crosses an icon', async ({ page, extension }) => {
  await setup(page, extension)
  const settings = await page.locator('[data-ylc-settings-btn]').boundingBox()
  const drag = await page.locator('[data-ylc-drag-handle]').boundingBox()
  if (!settings || !drag) throw new Error('Expected visible control bounds.')
  await page.mouse.move(1200, 30)
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 100))
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await page.mouse.move(settings.x + settings.width / 2, settings.y + settings.height / 2)
  await page.clock.runFor(199)
  await expect(tooltip).toHaveCount(0)
  await page.clock.runFor(1)
  await expect(tooltip).toContainText('Open settings')
  await page.mouse.move(drag.x + drag.width / 2, drag.y + drag.height / 2)
  await expect(tooltip).toHaveCount(0)
  await page.clock.runFor(100)
  await page.mouse.move(1200, 30)
  await page.clock.runFor(500)
  await expect(tooltip).toHaveCount(0)
  await page.clock.resume()
})

test('dismisses focused visual help with Escape until focus changes', async ({ page, extension }) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 400, height: 300 }, { x: 100, y: 80 })
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  await placement.click()
  await page.mouse.move(1200, 30)
  await page.keyboard.press('Shift+Tab')
  const drag = page.locator('[data-ylc-drag-handle]')
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await expect(drag).toBeFocused()
  await expect(tooltip).toContainText('Use arrow keys to move')
  await drag.hover()
  await expect(tooltip).toContainText('Use arrow keys to move')

  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await expect(drag).toBeFocused()
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  await page.mouse.move(1200, 30)
  await expect(tooltip).toHaveCount(0)
  await page.keyboard.press('ArrowRight')
  await expect(tooltip).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(placement).toBeFocused()
  await expect(tooltip).toContainText('Adjust position and size')
})

test('closes placement when Tab leaves the rail without stealing the next focus', async ({ page, extension }) => {
  await setup(page, extension)
  await page.evaluate(() => {
    const host = document.getElementById('shadow-root-live-chat')
    if (!host) throw new Error('The overlay host must exist before adding the next native tab stop.')
    const next = document.createElement('button')
    next.textContent = 'Continue watching'
    next.id = 'fixture-next-native-control'
    host.after(next)
  })
  const placement = page.locator('[data-ylc-placement-button]')
  await placement.click()
  const panel = page.locator('[data-ylc-placement-panel]')
  const close = panel.getByRole('button', { name: 'Close', exact: true })
  await close.focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Continue watching', exact: true })).toBeFocused()
  await expect(panel).toHaveCount(0)
  await expect(placement).toHaveAttribute('aria-expanded', 'false')
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
})

test('declares translated overlay control language and direction without changing native documents', async ({
  page,
  extension,
}, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 400, height: 480 }, { x: 100, y: 80 })
  await page.evaluate(() => {
    document.documentElement.lang = 'en'
    document.documentElement.dir = 'ltr'
  })
  const rail = page.locator('[data-ylc-control-rail]')
  await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'overlay-locale-review', value: 'ar' } })
  await expect(rail).toHaveAttribute('lang', 'ar')
  await expect(rail).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await page.locator('[data-ylc-settings-btn]').hover()
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await expect(tooltip).toBeVisible()
  expect(await tooltip.evaluate(element => getComputedStyle(element).direction)).toBe('rtl')
  await page.locator('[data-ylc-placement-button]').click()
  const panel = page.locator('[data-ylc-placement-panel]')
  await expect(panel).toBeVisible()
  expect(await panel.evaluate(element => getComputedStyle(element).direction)).toBe('rtl')
  const left = await panel.locator('[data-ylc-placement-action="left"]').boundingBox()
  const right = await panel.locator('[data-ylc-placement-action="right"]').boundingBox()
  if (!left || !right) throw new Error('Physical placement buttons must have rendered bounds.')
  expect(left.x + left.width).toBeLessThan(right.x)
  await expect(panel.locator('.ylc-placement-step')).toHaveAttribute('dir', 'ltr')
  await page.screenshot({ path: testInfo.outputPath('rtl-placement.png') })
})

test('dismisses hover help from the native composer after its own Escape handler has finished', async ({ page, extension }) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 480, height: 360 }, { x: 100, y: 80 })
  const composer = page.frameLocator('iframe[data-ylc-chat]').locator('[aria-label="Chat draft"]')
  await composer.click({ position: { x: 12, y: 8 } })
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.type('unsent draft')
  await page.locator('[data-ylc-settings-btn]').hover()
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await expect(tooltip).toContainText('Open settings')
  await expect(composer).toBeFocused()
  await composer.evaluate(element => {
    element.addEventListener('keydown', event => event.preventDefault(), { once: true })
  })

  await page.keyboard.press('Escape')
  await expect(tooltip).toBeVisible()
  await expect(composer).toHaveText('unsent draft')
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await expect(composer).toBeFocused()
  await expect(composer).toHaveText('unsent draft')
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
})

test('keeps hover help readable under the pointer while native clicks still pass through it', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 400, height: 300 }, { x: 100, y: 80 })
  const settings = page.locator('[data-ylc-settings-btn]')
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await settings.hover()
  await expect(tooltip).toContainText('Open settings')
  const bounds = await tooltip.boundingBox()
  if (!bounds) throw new Error('Hover help must have painted bounds before moving over it.')
  await page.evaluate(bounds => {
    const target = document.createElement('button')
    target.textContent = 'Native video action'
    target.id = 'fixture-under-help'
    target.setAttribute('data-clicks', '0')
    Object.assign(target.style, {
      position: 'fixed',
      left: `${bounds.x}px`,
      top: `${bounds.y}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      zIndex: '0',
    })
    target.addEventListener('click', () => target.setAttribute('data-clicks', String(Number(target.getAttribute('data-clicks')) + 1)))
    document.fullscreenElement?.append(target)
  }, bounds)
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(point.x, point.y, { steps: 4 })
  await page.waitForTimeout(250)
  await expect(tooltip).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('hover-video.png'), animations: 'disabled' })
  await expect(tooltip).toHaveCSS('pointer-events', 'none')
  await page.mouse.click(point.x, point.y)
  await expect(page.locator('#fixture-under-help')).toHaveAttribute('data-clicks', '1')
  await expect(tooltip).toBeVisible()

  await page.mouse.move(1200, 30)
  await expect(tooltip).toHaveCount(0)
  await new ExtensionOverlay(page).revealControls()
  await settings.hover()
  await expect(tooltip).toBeVisible()
  await page.mouse.move(point.x, point.y, { steps: 4 })
  await expect(tooltip).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
})

test('retains click-through hover help over the borrowed chat document', async ({ page, extension }, testInfo) => {
  await setup(page, extension, { width: 1280, height: 720 }, { width: 240, height: 180 }, { x: 100, y: 530 })
  const settings = page.locator('[data-ylc-settings-btn]')
  const tooltip = page.locator('[data-ylc-control-tooltip]')
  await settings.hover()
  await expect(tooltip).toContainText('Open settings')
  const bounds = await tooltip.boundingBox()
  const chatBounds = await page.locator('iframe[data-ylc-chat]').boundingBox()
  if (!bounds || !chatBounds) throw new Error('Help and native chat must have painted bounds.')
  const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  expect(point.x).toBeGreaterThan(chatBounds.x)
  expect(point.x).toBeLessThan(chatBounds.x + chatBounds.width)
  expect(point.y).toBeGreaterThan(chatBounds.y)
  expect(point.y).toBeLessThan(chatBounds.y + chatBounds.height)
  const chat = page.frameLocator('iframe[data-ylc-chat]')
  await chat.locator('body').evaluate(
    (body, { bounds, chatBounds }) => {
      const target = body.ownerDocument.createElement('button')
      target.id = 'fixture-chat-under-help'
      target.textContent = 'Native chat action'
      target.setAttribute('data-clicks', '0')
      Object.assign(target.style, {
        position: 'fixed',
        left: `${bounds.x - chatBounds.x}px`,
        top: `${bounds.y - chatBounds.y}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
        zIndex: '9999',
      })
      target.addEventListener('click', event => {
        target.setAttribute('data-clicks', String(Number(target.getAttribute('data-clicks')) + 1))
        target.setAttribute('data-trusted', String(event.isTrusted))
      })
      body.append(target)
    },
    { bounds, chatBounds },
  )
  await page.mouse.move(point.x, point.y, { steps: 4 })
  await page.waitForTimeout(250)
  await expect(tooltip).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('hover-chat.png'), animations: 'disabled' })
  await page.mouse.click(point.x, point.y)
  await expect(chat.locator('#fixture-chat-under-help')).toHaveAttribute('data-clicks', '1')
  await expect(chat.locator('#fixture-chat-under-help')).toHaveAttribute('data-trusted', 'true')
  await expect(tooltip).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
})
