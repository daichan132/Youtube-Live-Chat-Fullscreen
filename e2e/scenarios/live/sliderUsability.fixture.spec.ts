import { type Extension, expect, test } from '@e2e/fixtures'
import { setRangeWithKeyboard } from '@e2e/utils/rangeInput'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { NumberSliderSettingKey } from '../../../entrypoints/content/features/YTDLiveChatSetting/components/YLCChangeItems/YLCNumberSlider'
import type { ChatProfile } from '../../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY, LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const readNumber = async (extension: Extension, key: NumberSliderSettingKey) => {
  const raw = await extension.storage.get([APPEARANCE_STORAGE_KEY])
  const entry = raw[APPEARANCE_STORAGE_KEY] as { value?: { profile?: ChatProfile } } | undefined
  if (!entry?.value?.profile) throw new Error('Expected persisted appearance settings')
  return entry.value.profile.appearance[key]
}

const controls = [
  { key: 'fontSize', label: 'Text Size', min: 10, max: 40, initial: 13, next: 24, dragged: 34 },
  { key: 'textShadow', label: 'Text Shadow', min: 0, max: 100, initial: 0, next: 65, dragged: 80 },
  { key: 'blur', label: 'Blur', min: 0, max: 20, initial: 0, next: 8, dragged: 16 },
  { key: 'spacing', label: 'Message Spacing', min: 0, max: 40, initial: 0, next: 16, dragged: 32 },
] satisfies { key: NumberSliderSettingKey; label: string; min: number; max: number; initial: number; next: number; dragged: number }[]

test.describe('appearance slider usability', { tag: '@fixture' }, () => {
  test.beforeEach(async ({ page, extension }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'slider-usability', value: 'en' } })
    await patchOverlayStore(extension, { profile: { appearance: { fontSize: 13, textShadow: 0, blur: 0, spacing: 0 } } })
    await page.goto(extension.url('settings.html'))
    await expect(page.getByRole('slider', { name: 'Text Size', exact: true })).toBeVisible()
  })

  test.afterEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('migrates the shadow switch and saves continuous strength after reload', async ({ page, extension }) => {
    await extension.storage.set({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'legacy-shadow',
        value: { profile: { appearance: { textShadow: true } } },
      },
    })
    await page.reload()
    const range = page.getByRole('slider', { name: 'Text Shadow', exact: true })
    await expect(range).toHaveValue('100')
    await expect(range).toHaveAttribute('aria-valuetext', '100%')
    await range.press('Home')
    await expect.poll(() => readNumber(extension, 'textShadow')).toBe(0)
    await range.press('ArrowRight')
    await expect.poll(() => readNumber(extension, 'textShadow')).toBe(1)
    await page.reload()
    await expect(range).toHaveValue('1')
    await range.press('End')
    await expect.poll(() => readNumber(extension, 'textShadow')).toBe(100)
  })

  for (const control of controls) {
    test(`adjusts ${control.label} with the keyboard, undoes one gesture, and saves after reload`, async ({ page, extension }) => {
      const range = page.getByRole('slider', { name: control.label, exact: true })
      await setRangeWithKeyboard(range, control.next)
      await expect(range).toHaveValue(String(control.next))
      await expect(range).toHaveAttribute('aria-valuetext', `${control.next}${control.key === 'textShadow' ? '%' : 'px'}`)
      await expect.poll(() => readNumber(extension, control.key)).toBe(control.next)
      const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
      await undo.click()
      await expect(range).toHaveValue(String(control.initial))
      await expect(undo).toBeDisabled()
      await setRangeWithKeyboard(range, control.next)
      await expect.poll(() => readNumber(extension, control.key)).toBe(control.next)
      await page.reload()
      await expect(range).toHaveValue(String(control.next))
    })

    test(`previews a real ${control.label} drag and saves it as one undo step`, async ({ page, extension }, testInfo) => {
      const range = page.getByRole('slider', { name: control.label, exact: true })
      const feedback = page.locator('.ylc-range-feedback')
      await expect(feedback).toHaveCount(0)
      await range.scrollIntoViewIfNeeded()
      const bounds = await range.boundingBox()
      if (!bounds) throw new Error('Expected a rendered native range')
      const trackStart = bounds.x + 8
      const trackWidth = bounds.width - 16
      const y = bounds.y + bounds.height / 2
      await page.mouse.move(trackStart + (trackWidth * (control.initial - control.min)) / (control.max - control.min), y)
      try {
        await page.mouse.down()
        for (const fraction of [0.4, 0.8]) await page.mouse.move(trackStart + trackWidth * fraction, y, { steps: 8 })
        await expect(range).toHaveValue(String(control.dragged))
        await expect(feedback).toHaveText(`${control.dragged}${control.key === 'textShadow' ? '%' : 'px'}`)
        await expect(feedback).toHaveCSS('pointer-events', 'none')
        expect((await range.boundingBox())?.width).toBe(bounds.width)
        expect(await readNumber(extension, control.key)).toBe(control.initial)
        if (control.key === 'fontSize') {
          await testInfo.attach('slider-value-during-drag', { body: await page.screenshot(), contentType: 'image/png' })
        }
      } finally {
        await page.mouse.up()
      }
      await expect(feedback).toHaveCount(0)
      await expect.poll(() => readNumber(extension, control.key)).toBe(control.dragged)
      const undo = page.getByRole('button', { name: 'Undo style change', exact: true })
      await undo.click()
      await expect(range).toHaveValue(String(control.initial))
      await expect(undo).toBeDisabled()
    })
  }

  for (const locale of ['en', 'ar']) {
    test(`shows the value only during keyboard adjustment and follows both ends in ${locale}`, async ({ page, extension }, testInfo) => {
      await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'slider-feedback', value: locale } })
      await page.reload()
      const range = page.locator('.ylc-range').first()
      const feedback = page.locator('.ylc-range-feedback')
      await range.hover()
      await range.focus()
      await expect(feedback).toHaveCount(0)
      for (const [key, text] of [
        ['End', '40px'],
        ['Home', '10px'],
      ] as const) {
        try {
          await page.keyboard.down(key)
          await expect(feedback).toHaveText(text)
          const bounds = await range.boundingBox()
          const bubble = await feedback.boundingBox()
          if (!bounds || !bubble) throw new Error('Expected visible slider feedback')
          const atRight = (key === 'End') !== (locale === 'ar')
          const thumbX = atRight ? bounds.x + bounds.width - 8 : bounds.x + 8
          expect(Math.abs(bubble.x + bubble.width / 2 - thumbX)).toBeLessThanOrEqual(2)
          expect(bubble.y + bubble.height).toBeLessThanOrEqual(bounds.y + bounds.height / 2 - 8)
          expect(bubble.x).toBeGreaterThanOrEqual(0)
          expect(bubble.x + bubble.width).toBeLessThanOrEqual(1280)
          await testInfo.attach(`slider-feedback-${locale}-${key}`, { body: await page.screenshot(), contentType: 'image/png' })
        } finally {
          await page.keyboard.up(key)
        }
        await expect(feedback).toHaveCount(0)
      }
      try {
        await page.keyboard.down('ArrowUp')
        await expect(feedback).toHaveText('11px')
        await page.keyboard.press('Tab')
        await expect(feedback).toHaveCount(0)
      } finally {
        await page.keyboard.up('ArrowUp')
      }
    })
  }

  test('aligns slider widths with the other editors without numeric fields and fits a small viewport', async ({ page }, testInfo) => {
    const font = page.getByRole('button', { name: /^Font / })
    const editorBounds = await font.boundingBox()
    if (!editorBounds) throw new Error('Expected visible font editor')
    await expect(page.getByRole('spinbutton')).toHaveCount(0)
    for (const control of controls) {
      const range = page.getByRole('slider', { name: control.label, exact: true })
      await range.scrollIntoViewIfNeeded()
      const bounds = await range.boundingBox()
      if (!bounds) throw new Error('Expected visible appearance slider')
      expect(Math.abs(bounds.x - editorBounds.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(bounds.width - editorBounds.width)).toBeLessThanOrEqual(1)
      expect(bounds.width).toBeGreaterThanOrEqual(170)
      await expect(range.locator('..')).toHaveText('')
    }
    await testInfo.attach('aligned-settings-sliders', { body: await page.screenshot(), contentType: 'image/png' })
    await page.setViewportSize({ width: 400, height: 300 })
    const range = page.getByRole('slider', { name: 'Text Size', exact: true })
    await setRangeWithKeyboard(range, 18)
    await expect(range).toHaveValue('18')
    const bounds = await range.boundingBox()
    if (!bounds) throw new Error('Expected visible slider')
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(400)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(300)
    await testInfo.attach('settings-sliders-small', { body: await page.screenshot(), contentType: 'image/png' })
  })
})
