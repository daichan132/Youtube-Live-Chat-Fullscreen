import { expect, test } from '@e2e/fixtures'
import type { Page } from '@playwright/test'
import { DEFAULT_CHAT_SETTINGS } from '../../../shared/settings/migrateSettings'
import { LOCALE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const confirmation = 'Replace appearance, presets, position, enabled state and theme with this backup. Language stays unchanged.'
const filename = 'keyboard-backup.json'

const chooseBackup = async (page: Page) => {
  const chooserPending = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  const chooser = await chooserPending
  await chooser.setFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ version: 2, globalSetting: { ytdLiveChat: false, themeMode: 'dark' }, chatSettings: DEFAULT_CHAT_SETTINGS }),
    ),
  })
  const dialog = page.getByRole('dialog', { name: 'Import', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription(`${filename} ${confirmation}`)
  await expect(dialog.getByRole('status')).toHaveText(confirmation)
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  return dialog
}

test.beforeEach(async ({ page, extension }) => {
  await page.setViewportSize({ width: 450, height: 650 })
  await extension.storage.set({ [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'backup-focus-fixture', value: 'en' } })
  await page.goto(extension.url('popup.html'))
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeVisible()
})

test.afterEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
})

test('describes backup confirmation and keeps keyboard cancellation local without saving', async ({ page }, testInfo) => {
  const before = await page.evaluate(() => chrome.storage.local.get(null))
  const dialog = await chooseBackup(page)
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
  const apply = dialog.getByRole('button', { name: 'Apply', exact: true })
  await page.keyboard.press('Shift+Tab')
  await expect(apply).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Export', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(apply).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(cancel).toBeFocused()
  await testInfo.attach('backup-dialog-keyboard-cancel', { body: await page.screenshot(), contentType: 'image/png' })
  await page.keyboard.press('Enter')

  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()
  expect(await page.evaluate(() => chrome.storage.local.get(null))).toEqual(before)
})

test('returns Escape and repeated-file cancellation to Import without applying settings', async ({ page }) => {
  const before = await page.evaluate(() => chrome.storage.local.get(null))
  const dialog = await chooseBackup(page)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()
  expect(await page.evaluate(() => chrome.storage.local.get(null))).toEqual(before)

  const reopened = await chooseBackup(page)
  await reopened.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(reopened).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import', exact: true })).toBeFocused()
  expect(await page.evaluate(() => chrome.storage.local.get(null))).toEqual(before)
})
