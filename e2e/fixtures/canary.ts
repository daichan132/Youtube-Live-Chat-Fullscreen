import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fullscreenTest } from '@e2e/fixtures/fullscreen'
import { launchExtensionContext, registerConsentHandler, waitForMv3Worker } from '@e2e/support/extension/extensionContext'
import { selectArchiveReplayUrl } from '@e2e/support/urls/archiveReplay'
import { findLiveUrlWithChat } from '@e2e/utils/liveUrl'
import type { BrowserContext } from '@playwright/test'
import type { CompatibilityFingerprint } from '../../entrypoints/content/diagnostics/compatibilityFingerprint'
import { CANARY_PROJECT_NAME } from '../config/projectClassification'
import { captureCompatibilityFingerprint } from '../support/compatibilityFingerprint'

type CanaryWorkerFixtures = {
  urlLookupContext: BrowserContext
  liveUrl: string | null
  archiveReplayUrl: string | null
  compatibilityHistory: Map<CompatibilityFingerprint['mode'], CompatibilityFingerprint>
}

export const test = fullscreenTest.extend<{}, CanaryWorkerFixtures>({
  urlLookupContext: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
    async ({}, use) => {
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-url-lookup-'))
      const context = await launchExtensionContext(userDataDir)
      await waitForMv3Worker(context)
      try {
        await use(context)
      } finally {
        await context.close()
        fs.rmSync(userDataDir, { recursive: true, force: true })
      }
    },
    { scope: 'worker', timeout: 120000 },
  ],

  liveUrl: [
    async ({ urlLookupContext }, use) => {
      const page = await urlLookupContext.newPage()
      await registerConsentHandler(page)
      try {
        await use(await findLiveUrlWithChat(page))
      } finally {
        await page.close()
      }
    },
    { scope: 'worker', timeout: 120000 },
  ],

  archiveReplayUrl: [
    async ({ urlLookupContext }, use) => {
      const page = await urlLookupContext.newPage()
      await registerConsentHandler(page)
      try {
        await use(await selectArchiveReplayUrl(page))
      } finally {
        await page.close()
      }
    },
    { scope: 'worker', timeout: 120000 },
  ],

  compatibilityHistory: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture requires destructuring
    async ({}, use) => use(new Map()),
    { scope: 'worker' },
  ],
})

test.afterEach(async ({ page, compatibilityHistory }, testInfo) => {
  if (testInfo.project.name !== CANARY_PROJECT_NAME || page.isClosed()) return
  const previous = [...compatibilityHistory.values()].at(-1) ?? null
  const artifact = await captureCompatibilityFingerprint(page, testInfo, previous)
  if (!artifact) return
  compatibilityHistory.set(artifact.fingerprint.mode, artifact.fingerprint)
  await testInfo.attach('compatibility-screenshot', {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  })
})
