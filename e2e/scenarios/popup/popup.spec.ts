import { expect, test } from '@e2e/fixtures'
import { importSettingsViaPopup, readStorageEntry } from '@e2e/utils/popupHelpers'
import { CHAT_STORAGE_KEY, GLOBAL_STORAGE_KEY } from '../../../shared/settings/storageKeys'

test.describe('popup', { tag: '@popup' }, () => {
  test('popup renders language selector and chat toggle', async ({ page, extension }) => {
    test.setTimeout(90000)

    await page.goto(extension.url('popup.html'))

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

  test('import persists settings and reflects on reopen', async ({ page, extension }) => {
    test.setTimeout(90000)

    const settings = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00.000Z',
      globalSetting: { ytdLiveChat: false, themeMode: 'dark' },
      ytdLiveChat: { fontSize: 42, blur: 10, alwaysOnDisplay: false },
    }

    await importSettingsViaPopup(page, extension, settings)

    // Wait for storage write
    await expect.poll(async () => (await readStorageEntry(extension, GLOBAL_STORAGE_KEY))?.value.themeMode ?? null).toBe('dark')

    // Verify global settings repository value
    const globalState = await readStorageEntry(extension, GLOBAL_STORAGE_KEY)
    expect(globalState?.value.ytdLiveChat).toBe(false)
    expect(globalState?.value.themeMode).toBe('dark')
    expect(globalState?.schemaVersion).toBe(1)

    // Verify chat settings repository value
    const ytdState = await readStorageEntry(extension, CHAT_STORAGE_KEY)
    const profile = ytdState?.value.profile as
      | {
          appearance?: { fontSize?: number; blur?: number }
          display?: { idleVisibility?: string }
        }
      | undefined
    expect(profile?.appearance?.fontSize).toBe(40)
    expect(profile?.appearance?.blur).toBe(10)
    expect(profile?.display?.idleVisibility).toBe('auto-hide')
    expect(ytdState?.schemaVersion).toBe(1)

    // Reopen popup and verify runtime hydration
    await page.goto(extension.url('popup.html'))
    await page.getByLabel('Select language').waitFor({ state: 'visible' })
    await expect(page.locator('[role="switch"]')).toHaveAttribute('aria-checked', 'false')
  })
})
