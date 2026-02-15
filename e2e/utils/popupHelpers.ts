import type { Page } from '@playwright/test'

type TestSettings = {
  version: number
  exportedAt: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

export const importSettingsViaPopup = async (page: Page, extensionId: string, settings: TestSettings) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  await page.getByLabel('Select language').waitFor({ state: 'visible' })
  await page.evaluate(() => {
    window.close = () => {}
  })

  await page.locator('input[type="file"]').setInputFiles({
    name: 'test-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(settings)),
  })
}

export const readStorageEntry = async (page: Page, key: string) => {
  const stored = await page.evaluate(k => chrome.storage.local.get(k), key)
  const raw = stored[key]
  if (!raw) return null
  return JSON.parse(raw as string) as { state: Record<string, unknown>; version: number }
}
