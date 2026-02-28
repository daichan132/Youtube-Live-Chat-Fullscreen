import type { Page } from '@playwright/test'
import type { Extension } from '@e2e/fixtures'
import type { TestSettings } from '@e2e/utils/popupHelpers'

export class ExtensionPopup {
  constructor(
    private page: Page,
    private extension: Extension,
  ) {}

  async open() {
    await this.page.goto(this.extension.url('popup.html'))
    await this.page.getByLabel('Select language').waitFor({ state: 'visible', timeout: 15000 })
  }

  async importSettings(settings: TestSettings) {
    await this.page.evaluate(() => {
      window.close = () => {}
    })
    await this.page.locator('input[type="file"]').setInputFiles({
      name: 'test-settings.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(settings)),
    })
  }

  async readStorage(key: string) {
    const stored = await this.page.evaluate(async k => chrome.storage.local.get(k), key)
    const raw = stored[key]
    if (!raw) return null
    return JSON.parse(raw as string) as { state: Record<string, unknown>; version: number }
  }

  async close() {
    await this.page.close().catch(() => null)
  }
}
