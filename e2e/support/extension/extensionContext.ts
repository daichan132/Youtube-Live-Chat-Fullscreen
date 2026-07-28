import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { E2E_EXTENSION_OUTPUT_DIR } from '@e2e/config/buildOutput'
import { resolveExtensionLaunchMode } from '@e2e/support/extensionLaunchMode'
import { PAGE_HELPERS_INIT_SCRIPT } from '@e2e/support/pageHelpers'
import { type BrowserContext, chromium, type Page, type Worker } from '@playwright/test'

const extensionOutputPath = path.resolve(E2E_EXTENSION_OUTPUT_DIR)
const EXTENSION_BOOT_TIMEOUT_MS = 45000
let bundledChromiumVersion: string | null = null

const resolveBundledChromiumVersion = () => {
  if (bundledChromiumVersion) return bundledChromiumVersion
  const versionOutput = execFileSync(chromium.executablePath(), ['--version'], { encoding: 'utf8' })
  const version = versionOutput.match(/\d+(?:\.\d+){3}/)?.[0]
  if (!version) throw new Error(`Could not resolve bundled Chromium version from: ${versionOutput.trim()}`)
  bundledChromiumVersion = version
  return version
}

export const launchExtensionContext = async (userDataDir: string) => {
  const context = await chromium.launchPersistentContext(userDataDir, {
    ...resolveExtensionLaunchMode(process.env, { browserVersion: resolveBundledChromiumVersion() }),
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionOutputPath}`, `--load-extension=${extensionOutputPath}`, '--mute-audio'],
  })
  await context.addInitScript(PAGE_HELPERS_INIT_SCRIPT)
  return context
}

export const isExtensionWorker = (worker: Worker) => worker.url().startsWith('chrome-extension://')

export const waitForMv3Worker = async (context: BrowserContext) => {
  const findWorker = () => context.serviceWorkers().find(isExtensionWorker) ?? null
  let worker = findWorker()
  if (worker) return worker

  const workerPromise = context
    .waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: EXTENSION_BOOT_TIMEOUT_MS })
    .catch(() => null)
  const warmup = await context.newPage()
  await warmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null)
  worker = findWorker() ?? (await workerPromise)
  await warmup.close()
  if (worker) return worker

  try {
    const cdp = await context.newCDPSession(context.pages()[0] ?? (await context.newPage()))
    await cdp.send('ServiceWorker.enable')
    await cdp.send('ServiceWorker.stopAllWorkers')
    await cdp.detach()
    const retryPromise = context.waitForEvent('serviceworker', { predicate: isExtensionWorker, timeout: 10_000 }).catch(() => null)
    const rewarmup = await context.newPage()
    await rewarmup.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => null)
    worker = findWorker() ?? (await retryPromise)
    await rewarmup.close().catch(() => null)
  } catch {
    // CDP restart is a best-effort fallback after the normal worker event path.
  }
  return worker
}

export const registerConsentHandler = (page: Page) =>
  page.addLocatorHandler(
    page.locator('button:has-text("Accept all"), button:has-text("I agree"), button:has-text("同意する")'),
    async button => {
      await button.first().click()
    },
    { noWaitAfter: true },
  )
