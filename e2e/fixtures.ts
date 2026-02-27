import path from 'node:path'
import { type BrowserContext, test as base, chromium, type Worker } from '@playwright/test'

const pathToExtension = path.resolve('.output/chrome-mv3')
const EXTENSION_BOOT_TIMEOUT_MS = 45000

export type Extension = {
  id: string
  worker: Worker | null
  url: (path: string) => string
  storage: {
    get(keys?: string | string[] | null): Promise<Record<string, unknown>>
    set(items: Record<string, unknown>): Promise<void>
    clear(): Promise<void>
  }
}

const waitForMv3Worker = async (context: BrowserContext) => {
  const deadline = Date.now() + EXTENSION_BOOT_TIMEOUT_MS
  const findWorker = () => context.serviceWorkers().find(worker => worker.url().startsWith('chrome-extension://')) ?? null

  let worker = findWorker()
  if (worker) return worker

  const warmup = await context.newPage()
  await warmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
  while (!worker && Date.now() < deadline) {
    worker = findWorker()
    if (worker) break
    const timeout = Math.min(3000, Math.max(1, deadline - Date.now()))
    await context.waitForEvent('serviceworker', { timeout }).catch(() => null)
  }
  await warmup.close()

  return worker
}

const resolveExtensionIdFromChromePage = async (context: BrowserContext) => {
  const page = await context.newPage()
  try {
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded', timeout: 20000 })
    const extensionId = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager')
      const managerRoot = manager?.shadowRoot
      const itemList = managerRoot?.querySelector('extensions-item-list')
      const itemListRoot = itemList?.shadowRoot
      const firstItem = itemListRoot?.querySelector('extensions-item')
      return firstItem?.getAttribute('id') ?? null
    })
    return extensionId
  } catch {
    return null
  } finally {
    await page.close().catch(() => null)
  }
}

const createWorkerStorageAccessor = (worker: Worker): Extension['storage'] => ({
  get: async (keys?: string | string[] | null) => {
    return worker.evaluate(async k => {
      if (k === undefined || k === null) return chrome.storage.local.get(null)
      return chrome.storage.local.get(k)
    }, keys ?? null)
  },
  set: async (items: Record<string, unknown>) => {
    await worker.evaluate(async i => {
      await chrome.storage.local.set(i)
    }, items)
  },
  clear: async () => {
    await worker.evaluate(async () => {
      await chrome.storage.local.clear()
    })
  },
})

const createPageStorageAccessor = (context: BrowserContext, extensionId: string): Extension['storage'] => {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`

  const withPopupPage = async <T>(fn: (page: import('@playwright/test').Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const result = await fn(page)
      await page.goto('about:blank')
      return result
    } finally {
      await page.close().catch(() => null)
    }
  }

  return {
    get: async (keys?: string | string[] | null) => {
      return withPopupPage(async page => {
        return (await page.evaluate(async k => {
          if (k === undefined || k === null) return chrome.storage.local.get(null)
          return chrome.storage.local.get(k)
        }, keys ?? null)) as Record<string, unknown>
      })
    },
    set: async (items: Record<string, unknown>) => {
      await withPopupPage(async page => {
        await page.evaluate(async i => {
          await chrome.storage.local.set(i)
        }, items)
      })
    },
    clear: async () => {
      await withPopupPage(async page => {
        await page.evaluate(async () => {
          await chrome.storage.local.clear()
        })
      })
    },
  }
}

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
  extension: Extension
}>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`, '--mute-audio'],
    })
    await use(context)
    await context.close()
  },
  extension: [
    async ({ context }, use) => {
      const worker = await waitForMv3Worker(context)

      const extensionIdFromWorker = worker ? worker.url().split('/')[2] : null
      const extensionId = extensionIdFromWorker ?? (await resolveExtensionIdFromChromePage(context))
      if (!extensionId) {
        throw new Error('Could not resolve extension ID from service worker or chrome://extensions.')
      }

      const storage = worker ? createWorkerStorageAccessor(worker) : createPageStorageAccessor(context, extensionId)

      const extension: Extension = {
        id: extensionId,
        worker,
        url: (p: string) => `chrome-extension://${extensionId}/${p}`,
        storage,
      }

      await use(extension)
    },
    { timeout: 60000 },
  ],
  extensionId: async ({ extension }, use) => {
    await use(extension.id)
  },
})
export const expect = test.expect
