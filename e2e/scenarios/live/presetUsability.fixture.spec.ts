import { expect, test } from '@e2e/fixtures'
import type { Locator } from '@playwright/test'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import { DEFAULT_CHAT_SETTINGS } from '../../../shared/settings/migrateSettings'
import { APPEARANCE_STORAGE_KEY, GEOMETRY_STORAGE_KEY, LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const profile = { ...DEFAULT_CHAT_SETTINGS.profile, appearance: { ...DEFAULT_CHAT_SETTINGS.profile.appearance, fontSize: 24 } }
const presetName = 'Night <$&> {name}'

test.beforeEach(async ({ page, extension }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'preset-usability', value: 'en' } })
  await patchOverlayStore(extension, {
    profile: DEFAULT_CHAT_SETTINGS.profile,
    presets: [...DEFAULT_CHAT_SETTINGS.presets,
      { id: 'night', kind: 'custom', name: presetName, profile },
      { id: 'copy', kind: 'custom', name: 'Same style', profile },
    ],
  })
  await page.goto(extension.url('settings.html'))
  await expect(page.getByRole('tab', { name: 'Presets', exact: true })).toBeVisible()
})

test.afterEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 720 }) })

test('keeps settings open when text selection ends on the backdrop, and closes on a real backdrop click', async ({ page }) => {
  const scenario = new YouTubeScenario(page)
  await scenario.load({ video: { id: 'preset-backdrop', title: 'Preset backdrop fixture', mode: 'live' }, page: { chatContainer: 'present', chatDimensions: 'standard' }, fullscreen: false, chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' } })
  await scenario.enterFullscreen()
  const overlay = new ExtensionOverlay(page)
  await overlay.expectChatLoaded({ timeout: 12000 })
  await overlay.revealControls()
  await page.locator('[data-ylc-settings-btn]').click()
  const frame = page.locator('[data-ylc-settings-frame]')
  const settings = page.frameLocator('[data-ylc-settings-frame]')
  await settings.getByRole('tab', { name: 'Presets', exact: true }).click()
  const nameInput = settings.getByRole('textbox', { name: 'Preset name', exact: true }).last()
  await nameInput.scrollIntoViewIfNeeded()
  const bounds = await nameInput.boundingBox()
  if (!bounds) throw new Error('Missing preset name input.')
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(2, 2, { steps: 10 })
  await page.mouse.up()
  await expect(frame).toBeVisible()
  await expect(settings.getByRole('tab', { name: 'Presets', exact: true })).toBeVisible()
  await page.mouse.click(2, 2)
  await expect(frame).toHaveCount(0)
})

test('names the exact deletion target and leaves settings intact on cancellation', async ({ page, extension }, testInfo) => {
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  const before = await extension.storage.get(APPEARANCE_STORAGE_KEY)
  await page.getByRole('button', { name: `Delete ${presetName}`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete', exact: true })
  await expect(dialog).toContainText(presetName)
  await expect(dialog).toHaveAccessibleDescription(`${presetName} This preset will be removed from the list. Your current chat settings will stay the same.`)
  await testInfo.attach('named-preset-deletion', { body: await page.screenshot(), contentType: 'image/png' })
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await extension.storage.get(APPEARANCE_STORAGE_KEY)).toEqual(before)
  await expect(page.getByRole('button', { name: `Delete ${presetName}`, exact: true })).toBeFocused()
})

test('selects the added name so typing immediately replaces Untitled', async ({ page, extension }, testInfo) => {
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  await page.locator('[data-ylc-add-preset]').click()
  const input = page.getByRole('textbox', { name: 'Preset name', exact: true }).last()
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('Untitled')
  expect(await input.evaluate(el => {
    if (!(el instanceof HTMLInputElement)) throw new Error('Expected a preset name input.')
    return [el.selectionStart, el.selectionEnd]
  })).toEqual([0, 8])
  await page.keyboard.type('Evening chat')
  await page.keyboard.press('Enter')
  await expect(input).toHaveValue('Evening chat')
  await expect.poll(async () => {
    const raw = await extension.storage.get(APPEARANCE_STORAGE_KEY)
    return (raw[APPEARANCE_STORAGE_KEY] as { value: { presets: Array<{ name?: string }> } }).value.presets.at(-1)?.name
  }).toBe('Evening chat')
  await testInfo.attach('named-new-preset', { body: await page.screenshot(), contentType: 'image/png' })
})

test('marks only matching settings, tracks edits and Undo, and keeps Apply focus stable', async ({ page, extension }, testInfo) => {
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  const geometry = await extension.storage.get(GEOMETRY_STORAGE_KEY)
  const apply = page.getByRole('button', { name: `Apply ${presetName}`, exact: true })
  const same = page.getByRole('button', { name: 'Apply Same style', exact: true })
  await expect(apply).toHaveAttribute('aria-pressed', 'false')
  await apply.click()
  await expect(apply).toHaveAttribute('aria-pressed', 'true')
  await expect(apply).toContainText('Current')
  await expect(apply).toBeFocused()
  await expect(same).toHaveAttribute('aria-pressed', 'true')
  await apply.click()
  await expect(apply).toBeFocused()
  expect(await extension.storage.get(GEOMETRY_STORAGE_KEY)).toEqual(geometry)
  await testInfo.attach('matching-presets', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('tab', { name: 'Settings', exact: true }).click()
  const size = page.getByRole('spinbutton', { name: 'Text Size', exact: true })
  await size.fill('26')
  await size.press('Enter')
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  await expect(apply).toHaveAttribute('aria-pressed', 'false')
  await expect(same).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Undo style change', exact: true }).click()
  await expect(apply).toHaveAttribute('aria-pressed', 'true')
  await expect(same).toHaveAttribute('aria-pressed', 'true')
})

test('keeps current-state labels and named deletion readable in a narrow Japanese panel', async ({ page, extension }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 600 })
  await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'preset-ja', value: 'ja' } })
  await page.getByRole('tab', { name: 'プリセット', exact: true }).click()
  const apply = page.getByRole('button', { name: `${presetName}を適用`, exact: true })
  await apply.click()
  await expect(apply).toHaveText('適用中')
  const panel = page.locator('.ylc-setting-panel')
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await testInfo.attach('narrow-current-presets', { body: await page.screenshot(), contentType: 'image/png' })
  await page.getByRole('button', { name: `${presetName}を削除`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '削除', exact: true })
  await expect(dialog).toContainText(presetName)
  const bounds = await dialog.locator('h3').boundingBox()
  if (!bounds) throw new Error('Expected visible deletion heading.')
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320)
  await testInfo.attach('narrow-named-deletion', { body: await page.screenshot(), contentType: 'image/png' })
})

test('persists deletion of built-in presets, including an empty list, across reloads', async ({ page, extension }) => {
  await patchOverlayStore(extension, { presets: [{ kind: 'builtin', id: 'standard' }] })
  await page.reload()
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  const row = page.locator('[data-ylc-preset-item="standard"]')
  await expect(row.locator('input')).toHaveAttribute('readonly', '')
  const beforeDeletion = await extension.storage.get(APPEARANCE_STORAGE_KEY)
  await row.getByRole('button', { name: /^Delete / }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(page.locator('[data-ylc-preset-item]')).toHaveCount(0)
  await expect.poll(async () => {
    const raw = await extension.storage.get(APPEARANCE_STORAGE_KEY)
    return (raw[APPEARANCE_STORAGE_KEY] as { value: { presets: unknown[] } }).value.presets
  }).toEqual([])
  const afterDeletion = await extension.storage.get(APPEARANCE_STORAGE_KEY)
  expect((afterDeletion[APPEARANCE_STORAGE_KEY] as { value: { profile: unknown } }).value.profile).toEqual(
    (beforeDeletion[APPEARANCE_STORAGE_KEY] as { value: { profile: unknown } }).value.profile,
  )
  await page.reload()
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  await expect(page.locator('[data-ylc-preset-item]')).toHaveCount(0)
  await page.locator('[data-ylc-add-preset]').click()
  await expect(page.locator('[data-ylc-preset-item]')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: 'Preset name', exact: true })).toBeFocused()
})

test('shows a pointer-following drag preview, ignores jitter, and saves only on drop', async ({ page, extension }, testInfo) => {
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  const before = await extension.storage.get(APPEARANCE_STORAGE_KEY)
  const rows = page.locator('[data-ylc-preset-item]')
  const firstId = await rows.first().getAttribute('data-ylc-preset-item')
  const first = page.locator(`[data-ylc-preset-item="${firstId}"]`)
  const handle = first.getByRole('button', { name: /^Reorder / })
  await handle.scrollIntoViewIfNeeded()
  const box = await handle.boundingBox()
  const rowBox = await first.boundingBox()
  const nextBox = await rows.nth(1).boundingBox()
  if (!box || !rowBox || !nextBox) throw new Error('Expected visible reorder controls.')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 2)
  await expect(page.locator('[data-ylc-preset-drag-preview]')).toHaveCount(0)
  await expect(rows.first()).toHaveAttribute('data-ylc-preset-item', firstId ?? '')
  const targetY = nextBox.y + nextBox.height / 2 + 2
  await page.mouse.move(x, targetY, { steps: 8 })
  const ghost = page.locator('[data-ylc-preset-drag-preview]')
  await expect(ghost).toBeVisible()
  await expect(first).toHaveAttribute('data-ylc-preset-dragging', 'true')
  await expect(async () => {
    const ghostBox = await ghost.boundingBox()
    expect(ghostBox?.y).toBeCloseTo(rowBox.y + targetY - y, 0)
    expect(ghostBox?.width).toBeCloseTo(rowBox.width, 0)
  }).toPass()
  expect(await extension.storage.get(APPEARANCE_STORAGE_KEY)).toEqual(before)
  await testInfo.attach('preset-drag-preview', { body: await page.screenshot(), contentType: 'image/png' })
  await page.mouse.up()
  await expect(ghost).toHaveCount(0)
  await expect(handle).toBeFocused()
  const order = await rows.evaluateAll(elements => elements.map(el => el.getAttribute('data-ylc-preset-item')))
  expect(order[0]).not.toBe(firstId)
  await expect.poll(async () => {
    const raw = await extension.storage.get(APPEARANCE_STORAGE_KEY)
    return (raw[APPEARANCE_STORAGE_KEY] as { value: { presets: Array<{ id: string }> } }).value.presets.map(preset => preset.id)
  }).toEqual(order)
  await page.reload()
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  expect(await rows.evaluateAll(elements => elements.map(el => el.getAttribute('data-ylc-preset-item')))).toEqual(order)
})

test('restores the order and removes the drag preview on Escape without saving', async ({ page, extension }) => {
  await page.getByRole('tab', { name: 'Presets', exact: true }).click()
  const before = await extension.storage.get(APPEARANCE_STORAGE_KEY)
  const rows = page.locator('[data-ylc-preset-item]')
  const order = await rows.evaluateAll(elements => elements.map(el => el.getAttribute('data-ylc-preset-item')))
  const handle = rows.first().getByRole('button', { name: /^Reorder / })
  const box = await handle.boundingBox()
  const target = await rows.nth(1).boundingBox()
  if (!box || !target) throw new Error('Expected reorder controls.')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, target.y + target.height / 2 + 2, { steps: 6 })
  await expect(page.locator('[data-ylc-preset-drag-preview]')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.locator('[data-ylc-preset-drag-preview]')).toHaveCount(0)
  expect(await rows.evaluateAll(elements => elements.map(el => el.getAttribute('data-ylc-preset-item')))).toEqual(order)
  expect(await extension.storage.get(APPEARANCE_STORAGE_KEY)).toEqual(before)
})

for (const scenario of [
  { locale: 'ja', width: 320, height: 280, zoom: 1, touch: false, dismiss: 'Escape' },
  { locale: 'de', width: 640, height: 560, zoom: 2, touch: false, dismiss: 'keyboard Cancel' },
  { locale: 'ar', width: 320, height: 280, zoom: 1, touch: true, dismiss: 'touch Cancel' },
]) {
  test(`keeps long preset deletion readable and cancellable in ${scenario.locale} at ${scenario.zoom * 100}% zoom`, async ({
    page,
    extension,
    context,
  }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: scenario.height })
    await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'preset-delete-fit', value: scenario.locale } })
    const name = '長いプリセット名の確認対象'.repeat(8).slice(0, 100)
    await patchOverlayStore(extension, { presets: [{ kind: 'custom', id: 'long-delete-target', name, profile }] })
    await page.reload()
    await expect(page.getByRole('tab').nth(1)).toBeVisible()
    await page.evaluate(async zoom => {
      const tab = await chrome.tabs.getCurrent()
      if (tab?.id === undefined) throw new Error('Settings tab unavailable')
      await chrome.tabs.setZoom(tab.id, zoom)
    }, scenario.zoom)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: scenario.touch, maxTouchPoints: 1 })
    const activate = async (target: Locator) => {
      if (!scenario.touch) {
        await target.click()
        return
      }
      await target.scrollIntoViewIfNeeded()
      const rect = await target.boundingBox()
      if (!rect) throw new Error('Expected a rendered touch control')
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }],
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    try {
      await activate(page.getByRole('tab').nth(1))
      const trigger = page.locator('[data-ylc-preset-item="long-delete-target"] .ylc-preset-del')
      const before = await extension.storage.get(APPEARANCE_STORAGE_KEY)
      await activate(trigger)
      const dialog = page.getByRole('dialog').last()
      const description = dialog.getByRole('region')
      await expect(description).toContainText(name)
      const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
      const content = await dialog.locator(':scope > div').boundingBox()
      if (!content) throw new Error('Expected deletion dialog content')
      expect(content.y).toBeGreaterThanOrEqual(11)
      expect(content.y + content.height).toBeLessThanOrEqual(viewport.height - 11)
      const actions = dialog.getByRole('button')
      for (const action of await actions.all()) {
        const bounds = await action.boundingBox()
        if (!bounds) throw new Error('Expected a rendered confirmation action')
        expect(bounds.y).toBeGreaterThanOrEqual(0)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
      }
      expect(await description.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(10)
      await page.screenshot({ path: testInfo.outputPath(`delete-${scenario.locale}-before-scroll.png`) })
      await expect(dialog.locator(':scope > div')).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(description).toBeFocused()
      const footerBefore = await actions.first().boundingBox()
      await page.keyboard.press('End')
      await expect.poll(() => description.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
      expect(await actions.first().boundingBox()).toEqual(footerBefore)
      await page.screenshot({ path: testInfo.outputPath(`delete-${scenario.locale}-after-scroll.png`) })
      if (scenario.dismiss === 'Escape') {
        await page.keyboard.press('Escape')
      } else if (scenario.dismiss === 'keyboard Cancel') {
        await page.keyboard.press('Tab')
        await expect(actions.first()).toBeFocused()
        await page.keyboard.press('Enter')
      } else {
        await activate(actions.first())
      }
      await expect(description).toHaveCount(0)
      expect(await extension.storage.get(APPEARANCE_STORAGE_KEY)).toEqual(before)
      await expect(trigger).toBeFocused()
      if (scenario.locale === 'ja') {
        await activate(trigger)
        const reopened = page.getByRole('dialog').last()
        await expect(reopened.locator(':scope > div')).toBeFocused()
        await page.keyboard.press('Tab')
        await expect(reopened.getByRole('region')).toBeFocused()
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        await expect(reopened.getByRole('button').last()).toBeFocused()
        await page.keyboard.press('Enter')
        await expect(page.locator('[data-ylc-preset-item]')).toHaveCount(0)
        await expect(page.locator('[data-ylc-add-preset]')).toBeFocused()
      }
    } finally {
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
      await cdp.detach()
      await page.evaluate(async () => {
        const tab = await chrome.tabs.getCurrent()
        if (tab?.id !== undefined) await chrome.tabs.setZoom(tab.id, 1)
      })
    }
  })
}
