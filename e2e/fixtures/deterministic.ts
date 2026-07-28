import { DETERMINISTIC_PROJECT_NAMES } from '@e2e/config/projectClassification'
import type { Extension } from '@e2e/support/extension/extensionIdentity'
import type { BrowserContext, Page } from '@playwright/test'
import { LOCALE_STORAGE_KEY } from '../../shared/settings/storageKeys'

export const isDeterministicProject = (projectName: string) =>
  DETERMINISTIC_PROJECT_NAMES.includes(projectName as (typeof DETERMINISTIC_PROJECT_NAMES)[number])

export const blockExternalNetwork = (context: BrowserContext) =>
  context.route(/^https?:\/\//, route => route.abort('blockedbyclient'))

export const resetDeterministicPage = async (page: Page, extension: Extension) => {
  await extension.storage.clear()
  await page.unrouteAll({ behavior: 'wait' })
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
  })
  await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 10000 })
  await extension.storage.clear()
  await extension.storage.set({
    [LOCALE_STORAGE_KEY]: {
      schemaVersion: 1,
      writerId: 'e2e-fixture',
      value: 'en',
    },
  })
  await page.bringToFront()
}
