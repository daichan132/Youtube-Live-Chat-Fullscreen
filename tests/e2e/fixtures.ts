import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { type BrowserContext, test as base, chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  context: async (_, use) => {
    const pathToExtension = path.join(__dirname, '../../dist')
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background) background = await context.waitForEvent('serviceworker')

    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
})
export const expect = test.expect
