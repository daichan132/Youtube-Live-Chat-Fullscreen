import { expect, test } from './fixtures'
import { importSettingsViaPopup, readStorageEntry } from './utils/popupHelpers'

test('popup renders language selector and chat toggle', async ({ page, extensionId }) => {
  test.setTimeout(90000)

  await page.goto(`chrome-extension://${extensionId}/popup.html`)

  const languageSelect = page.getByLabel('Select language')
  await expect(languageSelect).toBeVisible()
  const optionCount = await languageSelect.locator('option').count()
  expect(optionCount).toBeGreaterThan(1)

  const chatToggle = page.locator('[role="switch"]')
  await expect(chatToggle).toHaveCount(1)

  const initialChecked = await chatToggle.getAttribute('aria-checked')

  await chatToggle.click()
  await expect.poll(async () => chatToggle.getAttribute('aria-checked')).toBe(initialChecked === 'true' ? 'false' : 'true')
  await chatToggle.click()
  await expect.poll(async () => chatToggle.getAttribute('aria-checked')).toBe(initialChecked)

  const donateLink = page.locator('a[href*="ko-fi.com"]')
  await expect(donateLink).toHaveCount(1)
})

test('import persists settings and reflects on reopen', async ({ page, extensionId }) => {
  test.setTimeout(90000)

  const settings = {
    version: 1,
    exportedAt: '2024-01-01T00:00:00.000Z',
    globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
    ytdLiveChat: { fontSize: 42, blur: 10, alwaysOnDisplay: false },
  }

  await importSettingsViaPopup(page, extensionId, settings)

  // Wait for storage write
  await expect.poll(async () => (await readStorageEntry(page, 'globalSettingStore'))?.state.themeMode ?? null).toBe('dark')

  // Verify globalSettingStore
  const globalState = await readStorageEntry(page, 'globalSettingStore')
  expect(globalState?.state.ytdLiveChat).toBe(false)
  expect(globalState?.state.themeMode).toBe('dark')
  expect(globalState?.version).toBe(1)

  // Verify ytdLiveChatStore
  const ytdState = await readStorageEntry(page, 'ytdLiveChatStore')
  expect(ytdState?.state.fontSize).toBe(42)
  expect(ytdState?.state.blur).toBe(10)
  expect(ytdState?.state.alwaysOnDisplay).toBe(false)
  expect(ytdState?.version).toBe(2)

  // Reopen popup and verify Zustand hydration
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await page.getByLabel('Select language').waitFor({ state: 'visible' })
  await expect(page.locator('[role="switch"]')).toHaveAttribute('aria-checked', 'false')
})
