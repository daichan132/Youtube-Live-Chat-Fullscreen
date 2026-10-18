import type { Extension } from '@e2e/fixtures'
import type { Page } from '@playwright/test'
import type { ContentStatusResponse } from '../../shared/messaging/contentStatus'
import type { StoredEnvelope } from '../../shared/settings/repository'

type TestSettings = {
  version: number
  exportedAt: string
  globalSetting: Record<string, unknown>
  ytdLiveChat?: Record<string, unknown>
  chatSettings?: Record<string, unknown>
}

export type { TestSettings }

export const importSettingsViaPopup = async (page: Page, extension: Extension, settings: TestSettings) => {
  await page.goto(extension.url('popup.html'))
  await page.getByLabel('Select language').waitFor({ state: 'visible' })

  await page.locator('input[type="file"]').setInputFiles({
    name: 'test-settings.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(settings)),
  })
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await page.getByText('Import completed.', { exact: true }).waitFor()
}

/** Query the toolbar popup's public status channel after bringing the target tab to the front. */
export const readContentStatusViaPopup = (popup: Page): Promise<ContentStatusResponse | null> =>
  popup.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id === undefined) return null
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: 'ylc:status' }, { frameId: 0 })
    } catch {
      // An uninitialized or missing content script has no responder. Callers
      // must require a runtime response before asserting absent UI.
      return null
    }
  })

/**
 * Read a settings repository envelope from chrome.storage.local.
 *
 * Accepts either an Extension (uses SW or page-based storage) or a Page
 * already on an extension URL (reads directly, avoiding temporary popup pages
 * that could trigger runtime re-initialization side effects).
 */
export async function readStorageEntry<T>(source: Extension | Page, key: string): Promise<StoredEnvelope<T> | null> {
  let raw: unknown
  if ('storage' in source) {
    const stored = await source.storage.get(key)
    raw = stored[key]
  } else {
    const stored = await source.evaluate(async k => chrome.storage.local.get(k), key)
    raw = stored[key]
  }
  if (!raw || typeof raw !== 'object') return null
  const envelope = raw as Partial<StoredEnvelope<T>>
  if (envelope.schemaVersion !== 1 || typeof envelope.writerId !== 'string' || !('value' in envelope)) return null
  return envelope as StoredEnvelope<T>
}
