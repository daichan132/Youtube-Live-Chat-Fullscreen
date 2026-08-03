import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { blockExternalNetwork, isDeterministicProject, resetDeterministicPage } from '@e2e/fixtures/deterministic'
import { extensionUsesServiceWorker, launchExtensionContext, registerConsentHandler } from '@e2e/support/extension/extensionContext'
import { attachFailureDiagnostics, observeBrowserLogs } from '@e2e/support/extension/extensionDiagnostics'
import { type Extension, resolveExtension } from '@e2e/support/extension/extensionIdentity'
import { type BrowserContext, test as base, type Page } from '@playwright/test'

export type ExtensionTestFixtures = {
  context: BrowserContext
  extensionId: string
  extension: Extension
  _extensionDiagnostics: void
}

export type FullscreenWorkerFixtures = {
  sharedContext: BrowserContext
  sharedExtension: Extension
  sharedPage: Page
}

export const fullscreenTest = base.extend<ExtensionTestFixtures, FullscreenWorkerFixtures>({
  sharedContext: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
    async ({}, use, workerInfo) => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-ext-'))
      const context = await launchExtensionContext(userDataDir)
      if (isDeterministicProject(workerInfo.project.name)) await blockExternalNetwork(context)
      try {
        await use(context)
      } finally {
        await context.close()
        fs.rmSync(userDataDir, { recursive: true, force: true })
      }
    },
    { scope: 'worker', timeout: 120000 },
  ],

  sharedExtension: [
    async ({ sharedContext }, use, workerInfo) => {
      await use(await resolveExtension(sharedContext, extensionUsesServiceWorker() && !isDeterministicProject(workerInfo.project.name)))
    },
    { scope: 'worker', timeout: 120000 },
  ],

  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage()
      await registerConsentHandler(page)
      for (const candidate of sharedContext.pages()) {
        if (candidate !== page) await candidate.close()
      }
      await use(page)
      // Never close this page: closing a fullscreen-capable page breaks fullscreen
      // for every later page in the persistent Chromium context.
    },
    { scope: 'worker', timeout: 120000 },
  ],

  context: async ({ sharedContext }, use) => {
    await use(sharedContext)
  },

  extension: [
    async ({ sharedExtension }, use) => {
      await use(sharedExtension)
    },
    { timeout: 60000 },
  ],

  extensionId: async ({ extension }, use) => {
    await use(extension.id)
  },

  page: async ({ sharedPage, sharedExtension }, use) => {
    await resetDeterministicPage(sharedPage, sharedExtension)
    await use(sharedPage)
  },

  _extensionDiagnostics: [
    async ({ page }, use, testInfo) => {
      const logs = observeBrowserLogs(page)
      try {
        await use()
      } finally {
        try {
          await attachFailureDiagnostics(page, testInfo, logs.buffer)
        } finally {
          logs.dispose()
        }
      }
    },
    { auto: true },
  ],
})
