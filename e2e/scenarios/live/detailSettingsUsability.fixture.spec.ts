import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator } from '@playwright/test'
import { DEFAULT_CHAT_SETTINGS } from '../../../shared/settings/migrateSettings'
import { LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const scenarioState = {
  video: { id: 'localized-settings-header', title: 'Localized settings header fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

const expectInside = async (element: Locator, container: Locator) => {
  const [inner, outer] = await Promise.all([element.boundingBox(), container.boundingBox()])
  expect(inner).not.toBeNull()
  expect(outer).not.toBeNull()
  if (!inner || !outer) throw new Error('Expected rendered settings controls')
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1)
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1)
  expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1)
  expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 1)
}

test.describe('localized settings header and independent tab scrolling', { tag: '@fixture' }, () => {
  test.afterEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const locale of ['de', 'fr', 'ru']) {
    for (const width of [320, 400]) {
      test(`keeps tabs, history and close usable in ${locale} at ${width}px`, async ({ page, extension }, testInfo) => {
        await page.setViewportSize({ width, height: 420 })
        await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'detail-settings', value: locale } })
        await patchOverlayStore(extension, {
          profile: { appearance: { fontSize: 13 }, display: { contentMode: 'full-chat', idleVisibility: 'always-visible' } },
          geometry: { reference: 'player', rect: { x: 0.05, y: 0.1, width: 0.65, height: 0.5 }, pinned: true },
        })
        const scenario = new YouTubeScenario(page)
        await scenario.load(scenarioState)
        await scenario.enterFullscreen()
        const overlay = new ExtensionOverlay(page)
        await overlay.expectChatLoaded({ timeout: 12000 })
        await overlay.frame().hover({ force: true })
        await expect(page.locator('[data-ylc-settings-btn]')).toBeVisible()
        await page.locator('[data-ylc-settings-btn]').click()
        const settingsFrame = overlay.settingsFrame()
        const panel = settingsFrame.locator('.ylc-setting-panel')
        const header = panel.locator('header')
        const tabs = settingsFrame.getByRole('tab')
        const undo = header.locator('.ylc-setting-history-button').nth(0)
        const redo = header.locator('.ylc-setting-history-button').nth(1)
        const close = settingsFrame.locator('[data-ylc-setting-close-button]')
        await expect(tabs).toHaveCount(2)
        for (const control of [tabs.nth(0), tabs.nth(1), undo, redo, close]) await expectInside(control, header)
        const actionsBounds = await header.locator('.ylc-setting-header-actions').boundingBox()
        const tabsBounds = await header.getByRole('tablist').boundingBox()
        if (!actionsBounds || !tabsBounds) throw new Error('Expected both rows of the compact header')
        expect(actionsBounds.y + actionsBounds.height).toBeLessThanOrEqual(tabsBounds.y - 2)
        const bounds = await panel.boundingBox()
        expect(bounds).not.toBeNull()
        if (!bounds) throw new Error('Expected rendered settings panel')
        expect(bounds.x).toBeGreaterThanOrEqual(0)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
        expect(await panel.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
        for (const label of await tabs.locator('.ylc-setting-tab-label').all()) {
          expect(await label.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)
        }

        await tabs.nth(0).click()
        await page.keyboard.press('ArrowRight')
        await expect(tabs.nth(1)).toBeFocused()
        await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
        await page.keyboard.press('ArrowLeft')
        await expect(tabs.nth(0)).toBeFocused()
        const fontSize = settingsFrame.getByRole('spinbutton').first()
        await fontSize.fill('18')
        await fontSize.press('Enter')
        await expect(undo).toBeEnabled()
        await tabs.nth(0).click()
        await page.keyboard.press('Tab')
        await expect(undo).toBeFocused()
        await undo.click()
        await expect(fontSize).toHaveValue('13')
        await expect(redo).toBeEnabled()
        await redo.click()
        await expect(fontSize).toHaveValue('18')
        await testInfo.attach(`settings-header-${locale}-${width}`, { body: await page.screenshot(), contentType: 'image/png' })
        await close.click()
        await expect(page.locator('iframe[data-ylc-settings-frame]')).toHaveCount(0)
      })
    }
  }

  test('restores separate Settings and Presets positions after real wheel scrolling', async ({ page, extension }, testInfo) => {
    await page.setViewportSize({ width: 400, height: 300 })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'detail-settings', value: 'en' } })
    await patchOverlayStore(extension, {
      presets: [
        ...DEFAULT_CHAT_SETTINGS.presets,
        ...Array.from({ length: 8 }, (_, index) => ({
          kind: 'custom' as const,
          id: `scroll-profile-${index}`,
          name: `Scroll profile ${index + 1}`,
          profile: DEFAULT_CHAT_SETTINGS.profile,
        })),
      ],
    })
    await page.goto(extension.url('settings.html'))
    const content = page.getByRole('tabpanel')
    const settings = page.getByRole('tab', { name: 'Settings', exact: true })
    const presets = page.getByRole('tab', { name: 'Presets', exact: true })
    await expect(settings).toHaveAttribute('aria-selected', 'true')
    expect(await content.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(330)
    await content.hover()
    await page.mouse.wheel(0, 330)
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(330)
    await presets.click()
    await expect(content).toHaveAttribute('aria-labelledby', 'ylc-tab-preset')
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(0)
    await testInfo.attach('presets-first-visit-top', { body: await page.screenshot(), contentType: 'image/png' })

    await content.hover()
    await page.mouse.wheel(0, 120)
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(120)
    await settings.click()
    await expect(content).toHaveAttribute('aria-labelledby', 'ylc-tab-setting')
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(330)
    await testInfo.attach('settings-restored-scroll', { body: await page.screenshot(), contentType: 'image/png' })
    await presets.click()
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(120)
    await testInfo.attach('presets-restored-scroll', { body: await page.screenshot(), contentType: 'image/png' })
  })
})
