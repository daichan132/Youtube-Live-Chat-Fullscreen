import { createExtensionStorage, type ExtensionStorage } from '@e2e/support/extension/extensionStorage'
import { isExtensionWorker, waitForMv3Worker } from '@e2e/support/extension/extensionContext'
import type { BrowserContext, Worker } from '@playwright/test'

export type Extension = {
  id: string
  worker: Worker | null
  url: (path: string) => string
  storage: ExtensionStorage
}

const resolveExtensionIdFromChromePage = async (context: BrowserContext) => {
  const page = await context.newPage()
  try {
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 20000 })
    const extensionId = await page.waitForFunction(() => {
      const manager = document.querySelector('extensions-manager')
      const itemList = manager?.shadowRoot?.querySelector('extensions-item-list')
      const items = Array.from(itemList?.shadowRoot?.querySelectorAll('extensions-item') ?? [])
      for (const item of items) {
        const id = item.getAttribute('id')
        if (id) return id
      }
      return null
    }, undefined, { timeout: 20000 })
    return extensionId.jsonValue()
  } finally {
    await page.close().catch(() => null)
  }
}

export const resolveExtension = async (context: BrowserContext, waitForWorker: boolean): Promise<Extension> => {
  const worker = waitForWorker ? await waitForMv3Worker(context) : (context.serviceWorkers().find(isExtensionWorker) ?? null)
  const extensionId = (worker ? new URL(worker.url()).host : null) ?? (await resolveExtensionIdFromChromePage(context))
  if (!extensionId) throw new Error('Could not resolve extension ID from service worker or chrome://extensions.')
  return {
    id: extensionId,
    worker,
    url: path => `chrome-extension://${extensionId}/${path}`,
    storage: createExtensionStorage(context, extensionId, worker),
  }
}
