import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'

// Use the production extension and synthetic origins in a disposable profile.
// No HTTP request is permitted to reach the network or a live account.
const extensionPath = path.resolve('.output/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'))
assert(!JSON.stringify(manifest).includes('e2e'), 'Build the production extension before this test.')
const profile = await mkdtemp(path.join(os.tmpdir(), 'ylc-settings-embedding-'))
let context
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, '--mute-audio'],
  })
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
  const version = await worker.evaluate(() => chrome.runtime.getManifest().version)
  assert.equal(version, manifest.version)
  // URL.origin is "null" for extension schemes in Node; preserve its authority.
  const extensionUrl = new URL(worker.url())
  const extensionBase = `${extensionUrl.protocol}//${extensionUrl.host}`
  const settingsUrl = `${extensionBase}/settings.html?parentOrigin=https%3A%2F%2Fwww.youtube.com`
  const settingsHtml = `<!doctype html><html><body><iframe id="settings" style="width:100vw;height:100vh" src="${settingsUrl}"></iframe></body></html>`
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.protocol === 'chrome-extension:') return route.continue()
    if (url.origin === 'https://www.youtube.com' && ['/embedding-host', '/embedding-child'].includes(url.pathname)) {
      return route.fulfill({ contentType: 'text/html', body: settingsHtml })
    }
    if (url.origin === 'https://hostile.example' && url.pathname === '/nested') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body><iframe id="youtube" src="https://www.youtube.com/embedding-child"></iframe></body></html>',
      })
    }
    return route.abort('blockedbyclient')
  })

  const page = await context.newPage()
  await page.goto('https://www.youtube.com/embedding-host', { waitUntil: 'domcontentloaded' })
  await expect(page.frameLocator('#settings').getByRole('tablist')).toBeVisible({ timeout: 10000 })

  await page.goto(`${extensionBase}/popup.html`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(url => {
    const frame = document.createElement('iframe')
    frame.id = 'self-settings'
    frame.src = url
    frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh'
    document.body.appendChild(frame)
  }, settingsUrl)
  await expect(page.frameLocator('#self-settings').getByRole('tablist')).toBeVisible({ timeout: 10000 })

  const policyErrors = []
  page.on('console', message => {
    if (message.text().includes('frame-ancestors')) policyErrors.push(message.text())
  })
  await page.goto('https://hostile.example/nested', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#youtube')).toBeVisible()
  await expect(page.frameLocator('#youtube').locator('#settings')).toHaveCount(1)
  const nestedSettings = page.frameLocator('#youtube').frameLocator('#settings').getByRole('tablist')
  let outcome = 'pending'
  await expect.poll(async () => {
    outcome = policyErrors.length > 0 ? 'blocked' : await nestedSettings.count() > 0 ? 'rendered' : 'pending'
    return outcome
  }, { timeout: 10000 }).not.toBe('pending')
  assert.equal(outcome, 'blocked', 'CSP must reject a hostile ancestor above an allowed YouTube parent before rendering settings.')
  assert.equal(
    await nestedSettings.count(),
    0,
    'The rejected settings document must not render its storage-writing controls.',
  )

  console.log(JSON.stringify({
    status: 'passed',
    productionVersion: version,
    youtubeEmbeddingAllowed: true,
    selfEmbeddingAllowed: true,
    hostileAncestorRejected: true,
    forgedParentOriginDidNotBypassPolicy: true,
    network: 'offline fixtures only',
  }))
} finally {
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
