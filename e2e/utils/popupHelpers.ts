import type { Extension } from '@e2e/fixtures'
import type { Page } from '@playwright/test'
import type { StoredEnvelope } from '../../shared/settings/repository'

type TestSettings = {
  version: number
  exportedAt: string
  globalSetting: Record<string, unknown>
  ytdLiveChat: Record<string, unknown>
}

export type { TestSettings }

export const importSettingsViaPopup = async (page: Page, extension: Extension, settings: TestSettings) => {
  await page.goto(extension.url('popup.html'))
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

/**
 * Read a settings repository envelope from chrome.storage.local.
 *
 * Accepts either an Extension (uses SW or page-based storage) or a Page
 * already on an extension URL (reads directly, avoiding temporary popup pages
 * that could trigger runtime re-initialization side effects).
 */
export async function readStorageEntry(source: Extension | Page, key: string): Promise<StoredEnvelope<Record<string, unknown>> | null> {
  let raw: unknown
  if ('storage' in source) {
    const stored = await source.storage.get(key)
    raw = stored[key]
  } else {
    const stored = await source.evaluate(async k => chrome.storage.local.get(k), key)
    raw = stored[key]
  }
  if (!raw || typeof raw !== 'object') return null
  const envelope = raw as Partial<StoredEnvelope<Record<string, unknown>>>
  if (envelope.schemaVersion !== 1 || typeof envelope.writerId !== 'string' || !envelope.value || typeof envelope.value !== 'object')
    return null
  return envelope as StoredEnvelope<Record<string, unknown>>
}
