import { expect, test } from '@e2e/fixtures'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator } from '@playwright/test'
import { LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const expectInside = async (element: Locator, container: Locator) => {
  await expect(async () => {
    const [inner, outer] = await Promise.all([element.boundingBox(), container.boundingBox()])
    expect(inner).not.toBeNull()
    expect(outer).not.toBeNull()
    if (!inner || !outer) throw new Error('Expected rendered settings bounds')
    expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1)
    expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1)
  }).toPass()
}

test.describe('settings usability', { tag: '@fixture' }, () => {
  test.beforeEach(async ({ page, extension }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'settings-usability', value: 'en' } })
    expect(await patchOverlayStore(extension, { profile: { appearance: { fontFamily: 'Roboto' } } })).not.toBeNull()
    await page.goto(extension.url('settings.html'))
    await expect(page.getByRole('button', { name: 'Font', exact: true })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const viewport of [
    { width: 400, height: 300 },
    { width: 400, height: 720 },
    { width: 1280, height: 300 },
  ]) {
    test(`keeps fixed settings chrome reachable while content scrolls at ${viewport.width}x${viewport.height}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport)
      const panel = page.locator('.ylc-setting-panel')
      const header = panel.locator('header')
      const footer = panel.locator('footer')
      const close = page.locator('[data-ylc-setting-close-button]')
      for (const element of [panel, header, footer, close]) {
        const bounds = await element.boundingBox()
        expect(bounds).not.toBeNull()
        if (!bounds) throw new Error('Settings controls must be rendered')
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.y).toBeGreaterThanOrEqual(0)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
      }
      const before = { header: await header.boundingBox(), footer: await footer.boundingBox() }
      const content = page.getByRole('tabpanel')
      expect(await content.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
      await content.hover()
      await page.mouse.wheel(0, 400)
      await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      expect(await header.boundingBox()).toEqual(before.header)
      expect(await footer.boundingBox()).toEqual(before.footer)
      await testInfo.attach('responsive-settings', { body: await page.screenshot(), contentType: 'image/png' })
    })
  }

  test('keeps keyboard candidates visible with stable ARIA relations and restores trigger focus', async ({ page }, testInfo) => {
    const trigger = page.getByRole('button', { name: 'Font', exact: true })
    await trigger.click()
    const search = page.getByRole('combobox', { name: 'Search fonts', exact: true })
    await expect(search).toBeFocused()
    const slabId = await page.getByRole('option', { name: 'Roboto Slab', exact: true }).getAttribute('id')
    expect(slabId).toBeTruthy()
    for (let index = 0; index < 12; index += 1) await page.keyboard.press('ArrowDown')
    const activeId = await search.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    await expectInside(page.locator(`[id="${activeId}"]`), page.getByRole('listbox'))
    await expect(search).toBeFocused()
    await expect(search).toHaveAttribute('aria-controls', (await page.getByRole('listbox').getAttribute('id')) ?? '')
    await testInfo.attach('font-active-candidate', { body: await page.screenshot(), contentType: 'image/png' })
    await search.fill('Roboto Slab')
    await expect(page.getByRole('option')).toHaveCount(1)
    await expect(search).toHaveAttribute('aria-activedescendant', slabId ?? '')
    await page.keyboard.press('Enter')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveText('Roboto Slab')
    await page.keyboard.press('Enter')
    await expect(search).toBeFocused()
    await expect(search).toHaveAttribute('aria-activedescendant', slabId ?? '')
    await expectInside(page.getByRole('option', { name: 'Roboto Slab', exact: true }), page.getByRole('listbox'))
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(search).toHaveCount(0)
  })

  test('wraps the active font and lets Tab continue outside the list', async ({ page }) => {
    await page.getByRole('button', { name: 'Font', exact: true }).click()
    const search = page.getByRole('combobox', { name: 'Search fonts', exact: true })
    await expect(search).toBeFocused()
    const options = page.getByRole('option')
    const firstId = await options.first().getAttribute('id')
    const lastId = await options.last().getAttribute('id')
    expect(firstId).toBeTruthy()
    expect(lastId).toBeTruthy()
    await page.keyboard.press('ArrowUp')
    await expect(search).toHaveAttribute('aria-activedescendant', firstId ?? '')
    await page.keyboard.press('ArrowUp')
    await expect(search).toHaveAttribute('aria-activedescendant', lastId ?? '')
    await expectInside(options.last(), page.getByRole('listbox'))
    await page.keyboard.press('ArrowDown')
    await expect(search).toHaveAttribute('aria-activedescendant', firstId ?? '')
    await expectInside(options.first(), page.getByRole('listbox'))
    await page.keyboard.press('Tab')
    await expect(page.getByRole('slider', { name: 'Text Size', exact: true })).toBeFocused()
    await expect(search).toHaveCount(0)
  })

  test('keeps the font search and scrollable candidates inside a short settings body', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 400, height: 300 })
    await page.getByRole('button', { name: 'Font', exact: true }).click()
    const search = page.getByRole('combobox', { name: 'Search fonts', exact: true })
    await expect(search).toBeFocused()
    await expectInside(page.locator('[data-ylc-font-combobox-menu]'), page.getByRole('tabpanel'))
    for (let index = 0; index < 12; index += 1) await page.keyboard.press('ArrowDown')
    const activeId = await search.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    await expectInside(page.locator(`[id="${activeId}"]`), page.getByRole('listbox'))
    await testInfo.attach('short-font-picker', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('retains the intentional no-match Enter default-font behavior', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Font', exact: true })
    await trigger.click()
    const search = page.getByRole('combobox', { name: 'Search fonts', exact: true })
    await expect(search).toBeFocused()
    await search.fill('zzzznotanallowedfont')
    await expect(page.getByRole('option')).toHaveCount(0)
    await expect(search).not.toHaveAttribute('aria-activedescendant', /.+/)
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveText('Default')
    await expect(trigger).toBeFocused()
  })
})
