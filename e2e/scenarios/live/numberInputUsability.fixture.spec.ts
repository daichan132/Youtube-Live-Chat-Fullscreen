import { type Extension, expect, test } from '@e2e/fixtures'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Locator, Page } from '@playwright/test'
import type { NumberSliderSettingKey } from '../../../entrypoints/content/features/YTDLiveChatSetting/components/YLCChangeItems/YLCNumberSlider'
import type { ChatProfile } from '../../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY, LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const replaceWithKeyboard = async (page: Page, input: Locator, text: string) => {
  await input.click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(text)
}

const readNumber = async (extension: Extension, key: NumberSliderSettingKey) => {
  const raw = await extension.storage.get([APPEARANCE_STORAGE_KEY])
  const entry = raw[APPEARANCE_STORAGE_KEY] as { value?: { profile?: ChatProfile } } | undefined
  if (!entry?.value?.profile) throw new Error('Expected persisted appearance settings')
  return entry.value.profile.appearance[key]
}

test.describe('direct numeric settings input', { tag: '@fixture' }, () => {
  test.beforeEach(async ({ page, extension }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'numeric-usability', value: 'en' } })
    await patchOverlayStore(extension, { profile: { appearance: { fontSize: 13, blur: 0, spacing: 0 } } })
    await page.goto(extension.url('settings.html'))
    await expect(page.getByRole('spinbutton', { name: 'Text Size', exact: true })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  for (const control of [
    { key: 'fontSize', label: 'Text Size', initial: 13, next: 24 },
    { key: 'blur', label: 'Blur', initial: 0, next: 8 },
    { key: 'spacing', label: 'Message Spacing', initial: 0, next: 16 },
  ] satisfies { key: NumberSliderSettingKey; label: string; initial: number; next: number }[]) {
    test(`types ${control.label} locally and commits Enter plus blur as one undo step`, async ({ page, extension }) => {
      const number = page.getByRole('spinbutton', { name: control.label, exact: true })
      const range = page.getByRole('slider', { name: control.label, exact: true })
      await replaceWithKeyboard(page, number, String(control.next))
      await expect(number).toHaveValue(String(control.next))
      await expect(range).toHaveValue(String(control.initial))
      expect(await readNumber(extension, control.key)).toBe(control.initial)

      await page.keyboard.press('Enter')
      await expect(number).toBeFocused()
      await expect(range).toHaveValue(String(control.next))
      await expect.poll(() => readNumber(extension, control.key)).toBe(control.next)
      await page.keyboard.press('Tab')

      const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
      await undo.click()
      await expect(number).toHaveValue(String(control.initial))
      await expect(range).toHaveValue(String(control.initial))
      await expect(undo).toBeDisabled()
      await expect.poll(() => readNumber(extension, control.key)).toBe(control.initial)
    })
  }

  test('cancels Escape without closing settings and restores empty or fractional input without a save', async ({ page, extension }) => {
    const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
    await replaceWithKeyboard(page, number, '31')
    await page.keyboard.press('Escape')
    await expect(number).toBeFocused()
    await expect(number).toHaveValue('13')
    await expect(page.locator('.ylc-setting-panel')).toBeVisible()

    await replaceWithKeyboard(page, number, '')
    await page.keyboard.press('Tab')
    await expect(number).toHaveValue('13')
    await replaceWithKeyboard(page, number, '12.5')
    await page.keyboard.press('Enter')
    await expect(number).toHaveValue('13')
    await expect(page.getByRole('button', { name: 'Undo style change', exact: true })).toBeDisabled()
    expect(await readNumber(extension, 'fontSize')).toBe(13)
  })

  test('clamps valid integers at blur and Enter without losing earlier undo steps', async ({ page, extension }) => {
    const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
    await replaceWithKeyboard(page, number, '-8')
    await page.keyboard.press('Tab')
    await expect(number).toHaveValue('10')
    await expect.poll(() => readNumber(extension, 'fontSize')).toBe(10)
    await replaceWithKeyboard(page, number, '999')
    await page.keyboard.press('Enter')
    await expect(number).toHaveValue('40')
    await expect.poll(() => readNumber(extension, 'fontSize')).toBe(40)

    const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
    await undo.click()
    await expect(number).toHaveValue('10')
    await undo.click()
    await expect(number).toHaveValue('13')
    await expect(undo).toBeDisabled()
  })

  for (const control of [
    { key: 'fontSize', label: 'Text Size', min: 10, max: 40, initial: 13, final: 34 },
    { key: 'blur', label: 'Blur', min: 0, max: 20, initial: 0, final: 16 },
  ] satisfies { key: NumberSliderSettingKey; label: string; min: number; max: number; initial: number; final: number }[]) {
    test(`finishes numeric typing before grouping a real ${control.label} slider drag`, async ({ page, extension }) => {
      const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
      await replaceWithKeyboard(page, number, '24')
      const range = page.getByRole('slider', { name: control.label, exact: true })
      await range.scrollIntoViewIfNeeded()
      const bounds = await range.boundingBox()
      if (!bounds) throw new Error('Expected a rendered native range')
      const trackStart = bounds.x + 8
      const trackWidth = bounds.width - 16
      const y = bounds.y + bounds.height / 2
      await page.mouse.move(trackStart + (trackWidth * (control.initial - control.min)) / (control.max - control.min), y)
      let held = false
      try {
        await page.mouse.down()
        held = true
        await expect.poll(() => readNumber(extension, 'fontSize')).toBe(24)
        for (const fraction of [0.4, 0.8]) await page.mouse.move(trackStart + trackWidth * fraction, y, { steps: 8 })
        await expect(range).toHaveValue(String(control.final))
        expect(await readNumber(extension, control.key)).toBe(control.key === 'fontSize' ? 24 : control.initial)
        await page.mouse.up()
        held = false
        await expect.poll(() => readNumber(extension, control.key)).toBe(control.final)
      } finally {
        if (held) await page.mouse.up()
      }

      const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
      await undo.click()
      await expect(number).toHaveValue('24')
      await expect(page.getByRole('slider', { name: 'Blur', exact: true })).toHaveValue('0')
      await undo.click()
      await expect(number).toHaveValue('13')
      await expect(undo).toBeDisabled()
    })
  }

  test('discards a conflicting external value while preserving unrelated external changes', async ({ page, extension }) => {
    const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
    await replaceWithKeyboard(page, number, '30')
    await patchOverlayStore(extension, { profile: { appearance: { fontSize: 22, blur: 6 } } })
    await expect(number).toHaveValue('22')
    await page.keyboard.press('Tab')
    expect(await readNumber(extension, 'fontSize')).toBe(22)
    await expect(page.getByRole('button', { name: 'Undo style change', exact: true })).toBeDisabled()

    await replaceWithKeyboard(page, number, '23')
    await patchOverlayStore(extension, { profile: { appearance: { blur: 7 } } })
    await expect(page.getByRole('slider', { name: 'Blur', exact: true })).toHaveValue('7')
    await expect(number).toHaveValue('23')
    await page.keyboard.press('Enter')
    await expect.poll(() => readNumber(extension, 'fontSize')).toBe(23)
    expect(await readNumber(extension, 'blur')).toBe(7)
    await page.getByRole('button', { name: 'Undo style change', exact: true }).click()
    await expect(number).toHaveValue('22')
    await expect(page.getByRole('slider', { name: 'Blur', exact: true })).toHaveValue('7')
  })

  test('keeps numeric controls visible and editable in a small settings viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 400, height: 300 })
    const number = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
    await replaceWithKeyboard(page, number, '18')
    await page.keyboard.press('Enter')
    await expect(number).toHaveValue('18')
    const bounds = await number.boundingBox()
    expect(bounds).not.toBeNull()
    if (!bounds) throw new Error('Expected visible numeric input')
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(400)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(300)
    await testInfo.attach('numeric-settings-small', { body: await page.screenshot(), contentType: 'image/png' })
  })
})
