import { type Extension, expect, test } from '@e2e/fixtures'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page } from '@playwright/test'
import type { ChatProfile } from '../../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY, LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const tabTo = async (page: Page, target: Locator) => {
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab')
    if (await target.evaluate(element => element === document.activeElement)) return
  }
  await expect(target).toBeFocused()
}

const readBackground = async (extension: Extension) => {
  const raw = await extension.storage.get([APPEARANCE_STORAGE_KEY])
  const entry = raw[APPEARANCE_STORAGE_KEY] as { value?: { profile?: ChatProfile } } | undefined
  if (!entry?.value?.profile) throw new Error('Expected persisted appearance settings')
  return entry.value.profile.appearance.backgroundColor
}

test.describe('color picker focus usability', { tag: '@fixture' }, () => {
  test.beforeEach(async ({ page, extension }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'color-focus', value: 'en' } })
    await patchOverlayStore(extension, {
      profile: { appearance: { backgroundColor: { r: 10, g: 20, b: 30, a: 0.4 }, membershipNameColor: { mode: 'youtube-default' } } },
    })
    await page.goto(extension.url('settings.html'))
    await expect(page.getByRole('button', { name: 'Background Color', exact: true })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('keeps internal sliders open and replaces the active picker through real Tab and Enter', async ({ page }, testInfo) => {
    const background = page.getByRole('button', { name: 'Background Color', exact: true })
    const text = page.getByRole('button', { name: 'Text Color', exact: true })
    const membership = page.getByRole('button', { name: 'Member Name Color', exact: true })
    const picker = page.getByRole('dialog', { name: 'Color picker', exact: true })
    await background.click()
    for (const name of ['Color', 'Hue', 'Alpha']) {
      await page.keyboard.press('Tab')
      await expect(picker.getByRole('slider', { name, exact: true })).toBeFocused()
      await expect(picker).toHaveCount(1)
      await expect(background).toHaveAttribute('aria-expanded', 'true')
    }

    await page.keyboard.press('Tab')
    await expect(text).toBeFocused()
    await expect(picker).toHaveCount(0)
    await expect(background).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(picker).toHaveCount(1)
    await expect(text).toHaveAttribute('aria-expanded', 'true')
    await tabTo(page, membership)
    await expect(picker).toHaveCount(0)
    await page.keyboard.press('Enter')
    await expect(picker).toHaveCount(1)
    await expect(membership).toHaveAttribute('aria-expanded', 'true')
    await expect(text).toHaveAttribute('aria-expanded', 'false')
    await testInfo.attach('single-color-picker', { body: await page.screenshot(), contentType: 'image/png' })
  })

  test('closes a picker while Tab continues to Font without stealing focus', async ({ page }) => {
    const background = page.getByRole('button', { name: 'Background Color', exact: true })
    const font = page.getByRole('button', { name: 'Font', exact: true })
    await background.click()

    await tabTo(page, font)

    await expect(page.getByRole('dialog', { name: 'Color picker', exact: true })).toHaveCount(0)
    await expect(background).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('combobox', { name: 'Search fonts', exact: true })).toBeFocused()
    await expect(page.getByRole('dialog', { name: 'Color picker', exact: true })).toHaveCount(0)
  })

  test('finishes a held color gesture once on focus exit and keeps Escape local to the reopened picker', async ({ page, extension }) => {
    const background = page.getByRole('button', { name: 'Background Color', exact: true })
    const text = page.getByRole('button', { name: 'Text Color', exact: true })
    const picker = page.getByRole('dialog', { name: 'Color picker', exact: true })
    await background.click()
    await tabTo(page, picker.getByRole('slider', { name: 'Alpha', exact: true }))
    let held = false
    try {
      await page.keyboard.down('ArrowRight')
      held = true
      await expect(picker.getByRole('slider', { name: 'Alpha', exact: true })).toHaveAttribute('aria-valuenow', '45')
      expect((await readBackground(extension)).a).toBe(0.4)
      await page.keyboard.press('Tab')
      await expect(text).toBeFocused()
      await expect(picker).toHaveCount(0)
      await page.keyboard.up('ArrowRight')
      held = false
      await expect.poll(async () => (await readBackground(extension)).a).toBe(0.45)
    } finally {
      if (held) await page.keyboard.up('ArrowRight')
    }
    const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
    await undo.click()
    await expect.poll(async () => (await readBackground(extension)).a).toBe(0.4)
    await expect(undo).toBeDisabled()

    await background.click()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Escape')
    await expect(picker).toHaveCount(0)
    await expect(background).toBeFocused()
    await expect(page.locator('.ylc-setting-panel')).toBeVisible()
    await expect(undo).toBeDisabled()
  })
})
