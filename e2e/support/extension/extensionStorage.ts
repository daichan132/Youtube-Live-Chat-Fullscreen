import { E2E_BRIDGE_FILE } from '@e2e/config/buildOutput'
import type { BrowserContext, Page, Worker } from '@playwright/test'

export type ExtensionStorage = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  clear(): Promise<void>
}

const isRecoverableWorkerError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return ['Target closed', 'Execution context was destroyed', 'Most likely the page has been closed'].some(token => message.includes(token))
}

export const createExtensionStorage = (
  context: BrowserContext,
  extensionId: string,
  initialWorker: Worker | null,
): ExtensionStorage => {
  let worker = initialWorker
  const bridgeUrl = `chrome-extension://${extensionId}/${E2E_BRIDGE_FILE}`

  const viaBridge = async <T>(operation: (page: Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(bridgeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      return await operation(page)
    } finally {
      await page.close().catch(() => null)
    }
  }

  const withFallback = async <T>(viaWorker: (activeWorker: Worker) => Promise<T>, viaPage: () => Promise<T>): Promise<T> => {
    if (worker) {
      try {
        return await viaWorker(worker)
      } catch (error) {
        if (!isRecoverableWorkerError(error)) throw error
        worker = null
      }
    }
    return viaPage()
  }

  return {
    get: keys =>
      withFallback(
        activeWorker => activeWorker.evaluate(value => chrome.storage.local.get(value), keys ?? null),
        () => viaBridge(page => page.evaluate(value => chrome.storage.local.get(value), keys ?? null)),
      ),
    set: items =>
      withFallback(
        activeWorker => activeWorker.evaluate(value => chrome.storage.local.set(value), items).then(() => {}),
        () => viaBridge(page => page.evaluate(value => chrome.storage.local.set(value), items).then(() => {})),
      ),
    clear: () =>
      withFallback(
        activeWorker => activeWorker.evaluate(() => chrome.storage.local.clear()).then(() => {}),
        () => viaBridge(page => page.evaluate(() => chrome.storage.local.clear()).then(() => {})),
      ),
  }
}
