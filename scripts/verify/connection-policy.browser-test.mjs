#!/usr/bin/env node
// Production regression: the page's Service Worker + Connection Allowlist must
// never own the extension's JSON/CSS requests. All web traffic stays local.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import https from 'node:https'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { compileYouTubeScenario } from '../../e2e/support/youtubeScenario/compiler.ts'

const extension = resolve(process.argv[2] ?? '.output/chrome-mv3')
const expectUnsafe = process.argv.includes('--expect-unsafe')
const directory = await mkdtemp(join(tmpdir(), 'ylc-policy-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'), '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=www.youtube.com'], { stdio: 'ignore' })
const scenario = compileYouTubeScenario({
  video: { id: 'ylc-policy-fixture', title: 'Local connection policy fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'playable' }, response: 'playable' },
})
const server = https.createServer({ key: await readFile(join(directory, 'key.pem')), cert: await readFile(join(directory, 'cert.pem')) }, (request, response) => {
  const url = new URL(request.url, 'https://www.youtube.com')
  if (url.pathname === '/sw.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' })
    response.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',()=>{});")
    return
  }
  const policy = url.searchParams.get('policy')
  response.writeHead(200, { 'Content-Type': 'text/html', ...(policy === 'report' ? { 'Connection-Allowlist-Report-Only': '(response-origin)' } : policy === 'enforce' ? { 'Connection-Allowlist': '(response-origin)' } : {}) })
  const chat = scenario.chatRoutes.find(route => url.pathname === new URL(route.pattern.replaceAll('**', ''), 'https://www.youtube.com').pathname)
  response.end(url.pathname === '/watch' ? scenario.watchHtml : chat?.body ?? '<!doctype html><title>Local policy seed</title>')
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
let context
try {
  context = await chromium.launchPersistentContext(join(directory, 'profile'), {
    channel: 'chromium', headless: true, ignoreDefaultArgs: ['--disable-extensions'], ignoreHTTPSErrors: true,
    args: [`--load-extension=${extension}`, `--disable-extensions-except=${extension}`, `--host-resolver-rules=MAP www.youtube.com 127.0.0.1:${server.address().port}`, '--proxy-server=direct://', '--ignore-certificate-errors', '--enable-features=ConnectionAllowlists', '--mute-audio'],
  })
  await context.route(/^https?:\/\/(?!www\.youtube\.com(?:\/|:))/, route => route.abort())
  const manager = await context.newPage()
  await manager.goto('chrome://extensions')
  const identity = await manager.evaluate(async () => {
    const items = await chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true })
    return items.map(item => ({ id: item.id, state: item.state, path: item.path }))
  })
  assert.equal(identity.length, 1)
  assert.equal(identity[0].state, 'ENABLED')
  assert.equal(identity[0].path, extension)
  await manager.close()
  const seed = await context.newPage()
  await seed.goto('https://www.youtube.com/seed')
  await seed.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise(done => navigator.serviceWorker.addEventListener('controllerchange', done, { once: true }))
  })
  await seed.close()
  const results = []
  for (const policy of ['none', 'report', 'enforce']) {
    const page = await context.newPage()
    const session = await context.newCDPSession(page)
    const errors = []
    await session.send('Log.enable')
    session.on('Log.entryAdded', ({ entry }) => {
      if (entry.text.includes('Unsafe attempt') && entry.text.includes('chrome-extension:')) errors.push(entry.text)
    })
    await page.goto(`${scenario.watchUrl}&policy=${policy}`)
    assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true)
    if (expectUnsafe && policy === 'enforce') {
      await page.waitForTimeout(1800)
      assert.equal(await page.locator('wxt-react-content').count(), 0)
    } else {
      await page.waitForSelector('wxt-react-content', { state: 'attached', timeout: 10000 })
      await page.locator('.ytp-fullscreen-button').click()
      await page.locator('[data-ylc-resizable]').waitFor({ state: 'visible', timeout: 12000 })
      assert.ok(await page.locator('wxt-react-content').evaluate(element => Array.from(element.shadowRoot.querySelectorAll('style')).some(style => style.textContent.length > 1000)))
      if (!expectUnsafe) assert.ok(await page.locator('#shadow-root-live-chat').evaluate(element => [...element.shadowRoot.querySelectorAll('style')].some(style => style.textContent.length > 1000)))
      // An enforced page policy also forbids navigation to any cross-origin
      // iframe (including settings.html). That is a distinct navigation policy,
      // not the asset-loading regression exercised here.
      if (policy !== 'enforce') {
        await page.locator('[data-ylc-resizable]').hover({ force: true })
        await page.locator('[data-ylc-settings-btn]').press('Enter', { timeout: 5000 })
        const frame = page.frameLocator('iframe[src*="settings.html"]')
        await frame.locator('[role=dialog]').waitFor({ state: 'visible', timeout: 10000 })
      }
    }
    if (expectUnsafe && policy !== 'none') assert.ok(errors.length > 0, 'original unsafe-load error must reproduce')
    else assert.equal(errors.length, 0, 'extension resources must not trigger page policy errors')
    results.push({ policy, unsafeErrors: errors.length, serviceWorkerControlled: true, uiReady: !(expectUnsafe && policy === 'enforce'), settingsVerified: policy !== 'enforce' })
    await page.close()
  }
  console.log(JSON.stringify({ browser: context.browser().version(), productionExtension: extension, results }, null, 2))
} finally {
  await context?.close()
  await new Promise(done => server.close(done))
  await rm(directory, { recursive: true, force: true })
}
