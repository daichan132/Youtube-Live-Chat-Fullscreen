import path from 'node:path'
import { type BrowserContext, test as base, chromium } from '@playwright/test'

const pathToExtension = path.resolve('.output/chrome-mv3')
const EXTENSION_BOOT_TIMEOUT_MS = 45000

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

const waitForMv2Background = async (context: BrowserContext) => {
  const deadline = Date.now() + EXTENSION_BOOT_TIMEOUT_MS
  let page = context.backgroundPages().find(bg => bg.url().startsWith('chrome-extension://')) ?? null
  while (!page && Date.now() < deadline) {
    const timeout = Math.min(3000, Math.max(1, deadline - Date.now()))
    await context.waitForEvent('backgroundpage', { timeout }).catch(() => null)
    page = context.backgroundPages().find(bg => bg.url().startsWith('chrome-extension://')) ?? null
  }
  return page
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

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  // biome-ignore lint/correctness/noEmptyPattern: <explanation>
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`, '--mute-audio'],
    })
    await use(context)
    await context.close()
  },
  extensionId: [
    async ({ context }, use) => {
      let background: { url(): string } | null = null
      if (pathToExtension.endsWith('-mv3')) {
        background = await waitForMv3Worker(context)
      } else {
        background = await waitForMv2Background(context)
      }

      const extensionIdFromBackground = background ? background.url().split('/')[2] : null
      const extensionId = extensionIdFromBackground ?? (await resolveExtensionIdFromChromePage(context))
      if (!extensionId) {
        throw new Error('Could not resolve extension ID from background/service worker or chrome://extensions.')
      }
      await use(extensionId)
    },
    { timeout: 60000 },
  ],
})
export const expect = test.expect
