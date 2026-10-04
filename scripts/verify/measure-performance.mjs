#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { compileYouTubeScenario } from '../../e2e/support/youtubeScenario/compiler.ts'
import { DEFAULT_CHAT_PROFILE } from '../../shared/settings/defaults.ts'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1])
const extensionPath = path.resolve(args.get('--extension') ?? '.output/chrome-mv3')
const outputPath = path.resolve(args.get('--out') ?? '/private/tmp/ylc-performance.json')
const chromeShape = args.get('--chrome') ?? 'panel'
assert(['panel', 'fallback', 'absent'].includes(chromeShape), '--chrome must be panel, fallback, or absent')
const instrumentation = args.get('--instrumentation') ?? 'counters'
assert(['counters', 'none'].includes(instrumentation), '--instrumentation must be counters or none')
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ylc-performance-'))
const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1280, height: 720 },
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, '--mute-audio'],
})

try {
  await context.route(/^https?:\/\//, route => route.abort('blockedbyclient'))
  const page = context.pages()[0] ?? await context.newPage()
  await page.goto('chrome://extensions/')
  const identity = await page.evaluate(async () => new Promise(resolve => {
    chrome.developerPrivate.getExtensionsInfo(items => resolve(items.map(item => ({ id: item.id, path: item.path, name: item.name }))))
  }))
  const extension = identity.find(item => path.resolve(item.path ?? '') === extensionPath)
  assert(extension, 'The exact requested extension must be loaded')
  await page.goto(`chrome-extension://${extension.id}/popup.html`)
  const profile = structuredClone(DEFAULT_CHAT_PROFILE)
  profile.display.contentMode = 'messages-only'
  await page.evaluate(async profile => {
    await chrome.storage.local.set({
      'ylc-chat-appearance': { schemaVersion: 1, writerId: 'performance-measurement', value: { profile, presets: [] } },
      'ylc-locale': { schemaVersion: 1, writerId: 'performance-measurement', value: 'en' },
    })
  }, profile)

  const compiled = compileYouTubeScenario({
    video: { id: 'ylc-performance', title: 'YLC performance measurement', mode: 'live' },
    page: { chatContainer: 'present', chatDimensions: 'standard' },
    fullscreen: false,
    chat: { mode: 'live', native: { state: 'playable' }, response: 'playable' },
  })
  const header = chromeShape === 'absent' ? '' : '<yt-live-chat-header-renderer style="display:block;height:56px">Chat menu</yt-live-chat-header-renderer>'
  const input = chromeShape === 'panel' ? '<div id="input-panel" style="height:64px">Input</div>'
    : chromeShape === 'fallback' ? '<yt-live-chat-sign-in-prompt-renderer style="display:block;height:64px">Sign in</yt-live-chat-sign-in-prompt-renderer>' : ''
  const chatHtml = compiled.chatRoutes[0].body.replace('<yt-live-chat-item-list-renderer></yt-live-chat-item-list-renderer>',
    `${header}<yt-live-chat-item-list-renderer><div id="items"></div></yt-live-chat-item-list-renderer>${input}`)
  await page.route(compiled.watchUrl, route => route.fulfill({ status: 200, contentType: 'text/html', body: compiled.watchHtml }))
  await page.route(compiled.chatRoutes[0].pattern, route => route.fulfill({ status: 200, contentType: 'text/html', body: chatHtml }))
  await page.goto(compiled.watchUrl)
  await page.getByRole('button', { name: 'Full screen', exact: true }).click()
  await page.waitForFunction(() => {
    const iframe = document.getElementById('shadow-root-live-chat')?.shadowRoot?.querySelector('iframe[data-ylc-chat]')
    return iframe?.contentDocument?.body?.classList.contains('chat-only-display')
  })
  await page.mouse.move(1000, 600)

  const cdp = await context.newCDPSession(page)
  const worlds = []
  cdp.on('Runtime.executionContextCreated', event => worlds.push(event.context))
  await cdp.send('Runtime.enable')
  await cdp.send('Performance.enable')
  let worldId
  for (const world of worlds.filter(world => !world.auxData?.isDefault)) {
    const result = await cdp.send('Runtime.evaluate', {
      contextId: world.id, awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        if (typeof chrome === 'undefined' || chrome.runtime?.id !== ${JSON.stringify(extension.id)}) return false
        const iframe = document.getElementById('shadow-root-live-chat')?.shadowRoot?.querySelector('iframe[data-ylc-chat]')
        const doc = iframe?.contentDocument
        if (!doc?.body) return false
        if (${JSON.stringify(instrumentation)} === 'none') return true
        const counts = { bodyQueries: 0, descendantQueries: 0, selectorMatches: 0, cssWrites: 0 }
        for (const method of ['querySelector', 'querySelectorAll']) {
          const query = doc.body[method]
          Object.defineProperty(doc.body, method, { configurable: true, value(...args) {
            counts.bodyQueries++
            return query.apply(this, args)
          } })
          for (const prototype of new Set([Element.prototype, doc.defaultView.Element.prototype])) {
            const original = prototype[method]
            Object.defineProperty(prototype, method, { configurable: true, value(...args) {
              if (this.ownerDocument === doc) counts.descendantQueries++
              return original.apply(this, args)
            } })
          }
        }
        for (const prototype of new Set([Element.prototype, doc.defaultView.Element.prototype])) {
          const matches = prototype.matches
          Object.defineProperty(prototype, 'matches', { configurable: true, value(...args) {
            if (this.ownerDocument === doc) counts.selectorMatches++
            return matches.apply(this, args)
          } })
        }
        const styles = [doc.documentElement.style, doc.body.style]
        for (const style of styles) {
          const set = style.setProperty
          Object.defineProperty(style, 'setProperty', { configurable: true, value(...args) {
            counts.cssWrites++
            return set.apply(this, args)
          } })
        }
        const probe = doc.createElement('div')
        probe.append(doc.createElement('span'))
        probe.querySelector('span')
        probe.matches('div')
        doc.body.querySelector('yt-live-chat-renderer')
        doc.body.querySelectorAll('yt-live-chat-renderer')
        if (counts.bodyQueries !== 2 || counts.descendantQueries !== 1 || counts.selectorMatches !== 1) {
          throw new Error('Selector counters did not attach to the iframe element realm')
        }
        await new Promise((resolve, reject) => {
          const observer = new MutationObserver(records => {
            observer.disconnect()
            try {
              const node = records[0].addedNodes[0]
              const before = { ...counts }
              node.querySelector('span')
              node.matches('div')
              if (counts.descendantQueries - before.descendantQueries !== 1 || counts.selectorMatches - before.selectorMatches !== 1) {
                throw new Error('Selector counters missed MutationObserver node wrappers')
              }
              resolve()
            } catch (error) { reject(error) }
          })
          observer.observe(doc.body, { childList: true })
          doc.body.append(probe)
        })
        probe.remove()
        for (const key of Object.keys(counts)) counts[key] = 0
        globalThis.__ylcPerformance = { counts, reset() { for (const key of Object.keys(counts)) counts[key] = 0 } }
        return true
      })()`,
    })
    if (result.result.value) { worldId = world.id; break }
  }
  assert(worldId, 'Performance counters must attach to the actual extension isolated world')
  const readCounts = async reset => {
    if (instrumentation === 'none') return {}
    const result = await cdp.send('Runtime.evaluate', {
      contextId: worldId, returnByValue: true,
      expression: reset ? '__ylcPerformance.reset()' : '({ ...__ylcPerformance.counts })',
    })
    assert(!result.exceptionDetails)
    return result.result.value
  }
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]))
  const delta = (before, after) => Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'LayoutCount', 'RecalcStyleCount']
    .map(key => [key, after[key] - before[key]]))
  const results = []
  for (let run = 0; run < 5; run++) {
    await page.evaluate(() => {
      const doc = document.getElementById('shadow-root-live-chat').shadowRoot.querySelector('iframe[data-ylc-chat]').contentDocument
      const list = doc.getElementById('items')
      list.replaceChildren()
      for (let index = 0; index < 1000; index++) {
        const message = doc.createElement('yt-live-chat-text-message-renderer')
        message.innerHTML = '<span>Viewer</span><span>Performance fixture message</span>'
        list.append(message)
      }
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await readCounts(true)
    const before = await metrics()
    const cadence = await page.evaluate(async () => {
      const doc = document.getElementById('shadow-root-live-chat').shadowRoot.querySelector('iframe[data-ylc-chat]').contentDocument
      const list = doc.getElementById('items')
      const frames = []
      let last = performance.now()
      for (let batch = 0; batch < 100; batch++) {
        for (let index = 0; index < 10; index++) {
          const message = doc.createElement('yt-live-chat-text-message-renderer')
          message.innerHTML = '<span>Viewer</span><span>Performance fixture message</span>'
          list.append(message)
          list.firstElementChild.remove()
        }
        await new Promise(resolve => requestAnimationFrame(resolve))
        const now = performance.now()
        frames.push(now - last)
        last = now
      }
      frames.sort((left, right) => left - right)
      return { medianFrameMs: frames[50], p95FrameMs: frames[95] }
    })
    const after = await metrics()
    const chatTraffic = { ...await readCounts(false), ...delta(before, after), ...cadence }
    await readCounts(true)
    const reconcileBefore = await metrics()
    await page.evaluate(async () => {
      for (let batch = 0; batch < 100; batch++) {
        document.getElementById('movie_player').classList.toggle('performance-signal')
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      }
    })
    const repeatedSignals = { ...await readCounts(false), ...delta(reconcileBefore, await metrics()) }
    results.push({ chatTraffic, repeatedSignals })
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  await page.screenshot({ path: outputPath.endsWith('.json') ? outputPath.slice(0, -5) + '.png' : outputPath + '.png' })
  const report = {
    capturedAt: new Date().toISOString(), platform: `${os.platform()} ${os.release()} ${os.arch()}`, instrumentation,
    browser: context.browser().version(), extension,
    contentSha256: createHash('sha256').update(fs.readFileSync(path.join(extensionPath, 'content-scripts/content.js'))).digest('hex'),
    workload: { initialMessages: 1000, batches: 100, messagesPerBatch: 10, runs: 5, repeatedPageSignals: 100, chromeShape,
      structure: 'header, message list with items, input after messages' },
    results,
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally {
  await context.close()
  fs.rmSync(profileDir, { recursive: true, force: true })
}
