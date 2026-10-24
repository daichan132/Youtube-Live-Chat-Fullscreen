import { expect, test } from '@e2e/fixtures'
import type { Locator, Page } from '@playwright/test'
import { ENABLED_STORAGE_KEY, LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '../../shared/settings/storageKeys'

// Sample painted CSS colors rather than duplicating theme token values. The
// targets below use flat surfaces; alpha backgrounds are composed with ancestors.
const colorsAt = (target: Locator, property: 'color' | 'backgroundColor' | 'borderTopColor' | 'borderRightColor' | 'outlineColor', pseudo: '::after' | '::before' | null = null) =>
  target.evaluate((element, { property, pseudo }) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas color sampling is unavailable')
    type Color = [number, number, number, number]
    const rgba = (value: string): Color => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = value
      context.fillRect(0, 0, 1, 1)
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b, a / 255]
    }
    const over = (front: Color, back: Color): Color => {
      const alpha = front[3] + back[3] * (1 - front[3])
      const blend = (index: 0 | 1 | 2) => (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / (alpha || 1)
      return [blend(0), blend(1), blend(2), alpha]
    }
    let background: Color = [0, 0, 0, 0]
    // Text is compared to its own background. A boundary/focus outline is
    // compared to the surface surrounding the control.
    let ancestor: Element | null = property === 'color' || pseudo ? element : element.parentElement
    while (ancestor) {
      background = over(background, rgba(getComputedStyle(ancestor).backgroundColor))
      ancestor = ancestor.parentElement
    }
    background = over(background, [255, 255, 255, 1])
    const foreground = over(rgba(getComputedStyle(element, pseudo)[property]), background)
    const luminance = ([r, g, b]: Color) => {
      const linear = (value: number) => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      }
      return linear(r) * 0.2126 + linear(g) * 0.7152 + linear(b) * 0.0722
    }
    const a = luminance(foreground)
    const b = luminance(background)
    return { foreground, background, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) }
  }, { property, pseudo })

const expectInViewport = async (page: Page, target: Locator) => {
  await target.scrollIntoViewIfNeeded()
  const bounds = await target.boundingBox()
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  expect(bounds).not.toBeNull()
  if (!bounds) throw new Error('Expected a rendered control')
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1)
}

test.describe('settings design accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 760 })
  })

  test.afterEach(async ({ page, context }) => {
    if (page.url().startsWith('chrome-extension://')) {
      await page.evaluate(async () => {
        const tab = await chrome.tabs.getCurrent()
        if (tab?.id !== undefined) await chrome.tabs.setZoom(tab.id, 1)
      })
    }
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
    await cdp.detach()
    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce', colorScheme: 'light' })
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const theme of ['light', 'dark']) {
    test(`keeps labels, input boundaries and keyboard focus legible in ${theme}`, async ({ page, extension }, testInfo) => {
      await extension.storage.set({ [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'design-accessibility', value: theme } })
      await page.goto(extension.url('settings.html'))
      await expect(page.getByRole('button', { name: 'Font', exact: true })).toBeVisible()
      for (const label of await page.locator('.ylc-setting-group-legend').all()) {
        expect((await colorsAt(label, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
      }
      const font = page.getByRole('button', { name: 'Font', exact: true })
      for (const control of [font, page.getByRole('button', { name: 'Background Color', exact: true })]) {
        expect((await colorsAt(control.locator('.ylc-color-value, .ylc-font-combobox-trigger-text'), 'color')).ratio).toBeGreaterThanOrEqual(4.5)
        expect((await colorsAt(control, 'borderRightColor', '::after')).ratio).toBeGreaterThanOrEqual(3)
        const affordance = await control.evaluate(element => {
          const arrow = getComputedStyle(element, '::after')
          return arrow.content !== 'none' && parseFloat(arrow.width) > 0 && parseFloat(arrow.borderRightWidth) > 0
        })
        expect(affordance).toBe(true)
        await page.keyboard.press('Tab')
        await control.focus()
        await expect(control).toBeFocused()
        await expect(control).toHaveCSS('outline-style', 'solid')
        await expect.poll(async () => (await colorsAt(control, 'outlineColor')).ratio).toBeGreaterThanOrEqual(3)
      }
      expect((await colorsAt(page.getByRole('spinbutton', { name: 'Text Size', exact: true }), 'color')).ratio).toBeGreaterThanOrEqual(4.5)
      const toggle = page.getByRole('switch').first()
      await toggle.uncheck()
      await expect.poll(async () => (await colorsAt(toggle, 'backgroundColor', '::before')).ratio).toBeGreaterThanOrEqual(3)
      await toggle.check()
      await expect.poll(async () => (await colorsAt(toggle, 'backgroundColor', '::before')).ratio).toBeGreaterThanOrEqual(3)
      const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
      await page.getByRole('slider', { name: 'Text Size', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(number).toBeFocused()
      await expect(number).toHaveCSS('outline-style', 'solid')
      expect(Number.parseFloat(await number.evaluate(element => getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2)
      expect((await colorsAt(number, 'outlineColor')).ratio).toBeGreaterThanOrEqual(3)
      await page.screenshot({ path: testInfo.outputPath(`settings-${theme}-keyboard.png`) })
      await page.getByRole('tab', { name: 'Presets', exact: true }).click()
      for (const apply of await page.locator('.ylc-preset-apply').all()) {
        expect((await colorsAt(apply, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  for (const locale of ['en', 'de', 'ja', 'ar']) {
    test(`reflows settings and color popovers without horizontal overflow at 320px in ${locale}`, async ({ page, extension }, testInfo) => {
      await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'design-reflow', value: locale } })
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto(extension.url('settings.html'))
      const panel = page.locator('.ylc-setting-panel')
      await expect(panel).toBeVisible()
      const content = page.getByRole('tabpanel')
      expect(await content.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
      for (const row of await page.locator('.ylc-row').all()) {
        await row.scrollIntoViewIfNeeded()
        const label = row.locator('.ylc-row-label')
        const action = row.locator('.ylc-row-action')
        const [text, control] = await Promise.all([label.boundingBox(), action.boundingBox()])
        expect(text).not.toBeNull()
        expect(control).not.toBeNull()
        if (!text || !control) throw new Error('Expected row content')
        const separated =
          text.y + text.height <= control.y + 1 || text.x + text.width <= control.x + 1 || control.x + control.width <= text.x + 1
        expect(separated, 'labels must not overlap their editors').toBe(true)
      }
      const color = page.locator('.ylc-color-trigger').first()
      const code = color.locator('.ylc-color-value')
      expect(
        await code.evaluate(element => {
          const text = element.firstChild
          if (!text) throw new Error('Color code text is missing')
          const range = document.createRange()
          range.setStart(text, 0)
          range.setEnd(text, 1)
          const first = range.getBoundingClientRect().left
          range.setStart(text, 1)
          range.setEnd(text, 2)
          return first < range.getBoundingClientRect().left
        }),
      ).toBe(true)
      await color.click()
      const picker = page.getByRole('dialog').last()
      await expectInViewport(page, picker)
      await page.screenshot({ path: testInfo.outputPath(`settings-${locale}-320.png`) })
      await page.keyboard.press('Escape')
      await expect(color).toBeFocused()
    })
  }

  test('keeps all settings controls reachable at 200% browser zoom', async ({ page, extension }, testInfo) => {
    await page.goto(extension.url('settings.html'))
    await expect(page.getByRole('tab', { name: 'Settings', exact: true })).toBeVisible()
    await page.evaluate(async () => {
      const tab = await chrome.tabs.getCurrent()
      if (tab?.id === undefined) throw new Error('Settings tab unavailable')
      await chrome.tabs.setZoom(tab.id, 2)
    })
    expect(await page.evaluate(() => chrome.tabs.getZoom())).toBe(2)
    const panel = page.locator('.ylc-setting-panel')
    const content = page.getByRole('tabpanel')
    expect(await content.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
    await expectInViewport(page, page.locator('[data-ylc-setting-close-button]'))
    await expectInViewport(page, page.getByRole('button', { name: 'Font', exact: true }))
    await page.getByRole('button', { name: 'Font', exact: true }).click()
    await expectInViewport(page, page.getByRole('combobox', { name: 'Search fonts', exact: true }))
    await page.keyboard.press('Escape')
    const settings = page.getByRole('tab', { name: 'Settings', exact: true })
    await settings.focus()
    await page.keyboard.press('End')
    await expect(page.getByRole('tab', { name: 'Presets', exact: true })).toBeFocused()
    await page.keyboard.press('Home')
    await expect(settings).toBeFocused()
    await panel.screenshot({ path: testInfo.outputPath('settings-200-percent.png') })
  })

  test('provides larger touch targets and a visible keyboard color-picker focus', async ({ page, context, extension }, testInfo) => {
    await page.goto(extension.url('settings.html'))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    try {
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      const font = page.getByRole('button', { name: 'Font', exact: true })
      await expect(font).toBeVisible()
      for (const control of [
        font,
        page.getByRole('spinbutton', { name: 'Text Size', exact: true }),
        page.getByRole('slider', { name: 'Text Size', exact: true }),
        page.locator('[data-ylc-setting-close-button]'),
      ]) {
        expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      }
      await page.getByRole('button', { name: 'Background Color', exact: true }).click()
      const hue = page.getByRole('slider', { name: 'Hue', exact: true })
      await hue.focus()
      await page.keyboard.press('Tab')
      const alpha = page.getByRole('slider', { name: 'Alpha', exact: true })
      await expect(alpha).toBeFocused()
      await expect(alpha).toHaveCSS('outline-style', 'solid')
      expect(Number.parseFloat(await alpha.evaluate(element => getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2)
      expect((await hue.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      expect((await alpha.boundingBox())?.height).toBeGreaterThanOrEqual(44)
      await page.screenshot({ path: testInfo.outputPath('settings-touch-picker.png') })
    } finally {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp.detach()
    }
  })

  for (const { locale, theme } of [
    { locale: 'uk', theme: 'light' },
    { locale: 'de', theme: 'dark' },
    { locale: 'ar', theme: 'dark' },
  ]) {
    test(`keeps preset touch actions inside their cards at 320px in ${locale}`, async ({ page, context, extension }, testInfo) => {
      await extension.storage.set({
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'preset-touch', value: locale },
        [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'preset-touch', value: theme },
      })
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto(extension.url('settings.html'))
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
      try {
        expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
        await page.getByRole('tab').nth(1).click()
        const panel = page.getByRole('tabpanel')
        expect(await panel.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
        for (const card of await panel.locator('.ylc-preset').all()) {
          await card.scrollIntoViewIfNeeded()
          expect(await card.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
          const bounds = await card.boundingBox()
          if (!bounds) throw new Error('Expected a preset card')
          for (const action of await card.getByRole('button').all()) {
            const target = await action.boundingBox()
            if (!target) throw new Error('Expected a preset action')
            expect(target.width).toBeGreaterThanOrEqual(44)
            expect(target.height).toBeGreaterThanOrEqual(44)
            expect(target.x).toBeGreaterThanOrEqual(bounds.x)
            expect(target.x + target.width).toBeLessThanOrEqual(bounds.x + bounds.width)
          }
        }
        const first = panel.locator('.ylc-preset').first()
        await first.scrollIntoViewIfNeeded()
        await page.screenshot({ path: testInfo.outputPath(`presets-${locale}-touch.png`) })
        await first.locator('.ylc-preset-del').click()
        const remove = page.locator('.ylc-dialog-btn-danger')
        await expect(remove).toBeVisible()
        expect((await colorsAt(remove, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
        await remove.hover()
        expect((await colorsAt(remove, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
        await expectInViewport(page, remove)
        await page.screenshot({ path: testInfo.outputPath(`preset-delete-${locale}.png`) })
        await page.keyboard.press('Escape')
        await expect(first.locator('.ylc-preset-del')).toBeFocused()
        await expect(panel.locator('.ylc-preset')).toHaveCount(7)
      } finally {
        await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
        await cdp.detach()
      }
    })
  }

  for (const { theme, locale } of [
    { theme: 'light', locale: 'en' },
    { theme: 'dark', locale: 'ar' },
  ]) {
    test(`keeps save errors readable and recovers the chosen setting in ${theme}`, async ({ page, extension }, testInfo) => {
      await extension.storage.set({
        [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'notice-design', value: theme },
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'notice-design', value: locale },
      })
      await page.goto(extension.url('popup.html'))
      const toggle = page.getByRole('switch').first()
      await expect(toggle).toBeChecked()
      await page.evaluate(() => {
        const original = chrome.storage.local.set.bind(chrome.storage.local)
        Reflect.set(window, '__ylcRestoreStorage', () => {
          chrome.storage.local.set = original
        })
        chrome.storage.local.set = async () => {
          throw new Error('Fixture storage unavailable')
        }
      })
      const restore = () =>
        page.evaluate(() => {
          const recover = Reflect.get(window, '__ylcRestoreStorage')
          if (typeof recover === 'function') recover()
          Reflect.deleteProperty(window, '__ylcRestoreStorage')
        })
      try {
        await toggle.uncheck()
        const notice = page.getByRole('alert')
        await expect(notice).toContainText('Settings could not be saved.')
        await expect(notice).toHaveAttribute('data-ylc-theme', theme)
        await expect(notice).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr')
        const message = notice.locator('.ylc-persistence-notice-message')
        await expect(message).toHaveAttribute('lang', 'en')
        expect((await colorsAt(message, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
        const retry = notice.getByRole('button', { name: 'Retry', exact: true })
        expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44)
        await page.keyboard.press('Shift+Tab')
        await expect(retry).toBeFocused()
        await expect(retry).toHaveCSS('outline-style', 'solid')
        expect((await colorsAt(retry, 'outlineColor')).ratio).toBeGreaterThanOrEqual(3)
        await page.screenshot({ path: testInfo.outputPath(`save-error-${theme}.png`) })
        await restore()
        await retry.click()
        await expect(notice).toHaveCount(0)
        await expect.poll(() => extension.storage.get(ENABLED_STORAGE_KEY)).toMatchObject({ [ENABLED_STORAGE_KEY]: { value: false } })
      } finally {
        await restore()
      }
    })
  }

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`preserves the edited colors and keyboard input in a forced-color palette in ${colorScheme}`, async ({
      page,
      extension,
    }, testInfo) => {
      await page.emulateMedia({ forcedColors: 'active', colorScheme })
      await page.goto(extension.url('settings.html'))
      const trigger = page.getByRole('button', { name: 'Background Color', exact: true })
      await trigger.click()
      const saturation = page.locator('.react-colorful__saturation .react-colorful__interactive')
      await page.keyboard.press('Tab')
      await expect(saturation).toBeFocused()
      await expect(saturation).toHaveCSS('outline-style', 'solid')
      await page.keyboard.press('ArrowRight')
      await expect(trigger.locator('.ylc-color-value')).not.toHaveText('#FFFFFF')
      const swatch = trigger.locator('.ylc-color-swatch-fill')
      const savedColor = await swatch.evaluate(element => (element as HTMLElement).style.backgroundColor)
      await expect(swatch).toHaveCSS('background-color', savedColor)
      for (const region of ['saturation', 'hue', 'alpha-gradient']) {
        await expect(page.locator(`.react-colorful__${region}`)).not.toHaveCSS('background-image', 'none')
      }
      // The surrounding interface still follows the system palette. Only the
      // visual color data opts out, so the swatch must differ from its button.
      expect(await swatch.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(
        await trigger.evaluate(element => getComputedStyle(element).backgroundColor),
      )
      await page.screenshot({ path: testInfo.outputPath(`settings-forced-colors-palette-${colorScheme}.png`) })
      await page.keyboard.press('Escape')
      await expect(trigger).toBeFocused()
    })
  }

  test('preserves switch states, slider tracks and distinct keyboard focus in forced colors', async ({ page, extension }, testInfo) => {
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto(extension.url('popup.html'))
    const system = page.getByRole('radio', { name: 'Auto', exact: true })
    const light = page.getByRole('radio', { name: 'Light', exact: true })
    await system.focus()
    await page.keyboard.press('ArrowRight')
    await expect(light).toBeChecked()
    await expect(light).toBeFocused()
    const label = page.locator('label').filter({ has: light })
    await expect(label).toHaveCSS('outline-offset', '2px')
    await page.goto(extension.url('settings.html'))
    const on = page.getByRole('switch', { name: 'Show When Idle', exact: true })
    await expect(on).toBeChecked()
    const before = await on.evaluate(element => ({
      track: getComputedStyle(element).backgroundColor,
      thumb: getComputedStyle(element, '::before').backgroundColor,
    }))
    expect(before.track).not.toEqual(before.thumb)
    await on.uncheck()
    const after = await on.evaluate(element => ({
      track: getComputedStyle(element).backgroundColor,
      thumb: getComputedStyle(element, '::before').backgroundColor,
    }))
    expect(after.track).not.toEqual(after.thumb)
    const slider = page.getByRole('slider', { name: 'Text Size', exact: true })
    await slider.scrollIntoViewIfNeeded()
    await slider.focus()
    await page.keyboard.press('ArrowRight')
    await page.screenshot({ path: testInfo.outputPath('settings-forced-colors.png') })
  })
})

for (const theme of ['light', 'dark']) {
  for (const forced of [false, true]) {
    test(`keeps the current preset readable and compact in ${theme}, forced colors ${forced}`, async ({ page, extension }, testInfo) => {
      await extension.storage.set({
        [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'current-preset-review', value: 'en' },
        [THEME_STORAGE_KEY]: { schemaVersion: 1, writerId: 'current-preset-review', value: theme },
      })
      await page.setViewportSize({ width: 480, height: 640 })
      await page.emulateMedia({ forcedColors: forced ? 'active' : 'none', colorScheme: theme as 'light' | 'dark' })
      await page.goto(extension.url('settings.html'))
      await page.getByRole('tab', { name: 'Presets', exact: true }).click()
      const current = page.locator('[data-ylc-preset-current="true"]').first()
      const status = current.getByRole('button', { pressed: true })
      await expect(status).toHaveText('Current')
      expect((await colorsAt(status, 'color')).ratio).toBeGreaterThanOrEqual(4.5)
      expect((await colorsAt(status.locator('svg'), 'color')).ratio).toBeGreaterThanOrEqual(3)
      expect((await current.boundingBox())?.height).toBeLessThanOrEqual(56)
      await status.focus()
      await expect(status).toBeFocused()
      expect((await colorsAt(status, 'outlineColor')).ratio).toBeGreaterThanOrEqual(3)
      await page.screenshot({ path: testInfo.outputPath(`current-preset-${theme}-${forced}.png`) })
    })
  }
}
