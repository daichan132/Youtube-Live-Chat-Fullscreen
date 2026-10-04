#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { compileYouTubeScenario } from '../../e2e/support/youtubeScenario/compiler.ts'
import { DEFAULT_CHAT_GEOMETRY, DEFAULT_CHAT_PROFILE } from '../../shared/settings/defaults.ts'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1])
const extensionPath = path.resolve(args.get('--extension') ?? '.output/chrome-mv3')
const outputPath = path.resolve(args.get('--out') ?? '/private/tmp/ylc-performance.json')
const chromeShape = args.get('--chrome') ?? 'panel'
assert(['panel', 'fallback', 'absent'].includes(chromeShape), '--chrome must be panel, fallback, or absent')
const instrumentation = args.get('--instrumentation') ?? 'counters'
assert(['counters', 'none'].includes(instrumentation), '--instrumentation must be counters or none')
const membershipColor = args.get('--membership-color') ?? 'youtube-default'
assert(['youtube-default', 'custom'].includes(membershipColor), '--membership-color must be youtube-default or custom')
const workload = args.get('--workload') ?? 'chat'
assert(['chat', 'controls', 'all'].includes(workload), '--workload must be chat, controls, or all')
const measureChat = workload !== 'controls'
const measureControls = workload !== 'chat'
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
  if (membershipColor === 'custom') profile.appearance.membershipNameColor = { mode: 'custom', value: { r: 12, g: 34, b: 56, a: 0.8 } }
  const geometry = structuredClone(DEFAULT_CHAT_GEOMETRY)
  await page.evaluate(async ({ profile, geometry }) => {
    await chrome.storage.local.set({
      'ylc-chat-appearance': { schemaVersion: 1, writerId: 'performance-measurement', value: { profile, presets: [] } },
      'ylc-chat-geometry': { schemaVersion: 1, writerId: 'performance-measurement', value: geometry },
      'ylc-locale': { schemaVersion: 1, writerId: 'performance-measurement', value: 'en' },
    })
  }, { profile, geometry })

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
  const watchHtml = measureControls ? compiled.watchHtml.replace('<div class="ytp-right-controls">', `
    <div class="ytp-chrome-bottom" style="position:absolute;left:0;bottom:0;width:1280px;height:48px">
      <div id="performance-control" style="position:absolute;left:200px;top:0;width:160px;height:48px;overflow:hidden">
        <span id="performance-control-text">Control text 0</span>
      </div>
    </div>
    <div class="ytp-right-controls">`) : compiled.watchHtml
  await page.route(compiled.watchUrl, route => route.fulfill({ status: 200, contentType: 'text/html', body: watchHtml }))
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
        const counts = {
          bodyQueries: 0, descendantQueries: 0, selectorMatches: 0, cssWrites: 0,
          bodyTextReads: 0, iframeDocumentQueries: 0, topDocumentQueries: 0,
          topElementQueries: 0, topSelectorMatches: 0, topRectReads: 0, iframeComputedStyleCalls: 0,
        }
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
              else if (this.ownerDocument === document) counts.topElementQueries++
              return original.apply(this, args)
            } })
          }
          for (const prototype of new Set([Document.prototype, doc.defaultView.Document.prototype])) {
            const original = prototype[method]
            Object.defineProperty(prototype, method, { configurable: true, value(...args) {
              if (this === doc) counts.iframeDocumentQueries++
              else if (this === document) counts.topDocumentQueries++
              return original.apply(this, args)
            } })
          }
        }
        for (const prototype of new Set([Element.prototype, doc.defaultView.Element.prototype])) {
          const matches = prototype.matches
          Object.defineProperty(prototype, 'matches', { configurable: true, value(...args) {
            if (this.ownerDocument === doc) counts.selectorMatches++
            else if (this.ownerDocument === document) counts.topSelectorMatches++
            return matches.apply(this, args)
          } })
          const rect = prototype.getBoundingClientRect
          Object.defineProperty(prototype, 'getBoundingClientRect', { configurable: true, value(...args) {
            if (this.ownerDocument === document) counts.topRectReads++
            return rect.apply(this, args)
          } })
        }
        for (const prototype of new Set([Node.prototype, doc.defaultView.Node.prototype])) {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, 'textContent')
          if (!descriptor?.get) throw new Error('The Node.textContent getter was not found')
          Object.defineProperty(prototype, 'textContent', { ...descriptor, get() {
            if (this === doc.body) counts.bodyTextReads++
            return descriptor.get.call(this)
          } })
        }
        for (const view of new Set([window, doc.defaultView])) {
          const getStyle = view.getComputedStyle
          Object.defineProperty(view, 'getComputedStyle', { configurable: true, value(...args) {
            if (args[0]?.ownerDocument === doc) counts.iframeComputedStyleCalls++
            return getStyle.apply(this, args)
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
        void doc.body.textContent
        doc.querySelector('yt-live-chat-renderer')
        doc.querySelectorAll('yt-live-chat-renderer')
        document.querySelector('body')
        document.querySelectorAll('body')
        const topProbe = document.createElement('div')
        topProbe.append(document.createElement('span'))
        topProbe.querySelector('span')
        topProbe.matches('div')
        topProbe.getBoundingClientRect()
        doc.defaultView.getComputedStyle(doc.documentElement)
        window.getComputedStyle(doc.body)
        doc.body.style.setProperty('--ylc-performance-probe', '1')
        doc.body.style.removeProperty('--ylc-performance-probe')
        if (counts.bodyQueries !== 2 || counts.descendantQueries !== 1 || counts.selectorMatches !== 1 ||
            counts.bodyTextReads !== 1 || counts.iframeDocumentQueries !== 2 || counts.topDocumentQueries !== 2 ||
            counts.topElementQueries !== 1 || counts.topSelectorMatches !== 1 || counts.topRectReads !== 1 ||
            counts.cssWrites !== 1 || counts.iframeComputedStyleCalls !== 2) {
          throw new Error('Performance counters did not attach to both document realms: ' + JSON.stringify(counts))
        }
        await new Promise((resolve, reject) => {
          const observer = new MutationObserver(records => {
            observer.disconnect()
            try {
              const node = records[0].addedNodes[0]
              const before = { ...counts }
              node.querySelector('span')
              node.matches('div')
              doc.defaultView.getComputedStyle(node)
              if (counts.descendantQueries - before.descendantQueries !== 1 || counts.selectorMatches - before.selectorMatches !== 1 ||
                  counts.iframeComputedStyleCalls - before.iframeComputedStyleCalls !== 1) {
                throw new Error('Selector counters missed MutationObserver node wrappers')
              }
              resolve()
            } catch (error) { reject(error) }
          })
          observer.observe(doc.body, { childList: true })
          doc.body.append(probe)
        })
        probe.remove()
        await new Promise((resolve, reject) => {
          const observer = new MutationObserver(records => {
            observer.disconnect()
            try {
              const node = records[0].addedNodes[0]
              const before = { ...counts }
              node.querySelector('span')
              node.matches('div')
              node.getBoundingClientRect()
              if (counts.topElementQueries - before.topElementQueries !== 1 ||
                  counts.topSelectorMatches - before.topSelectorMatches !== 1 || counts.topRectReads - before.topRectReads !== 1) {
                throw new Error('Performance counters missed top-document MutationObserver node wrappers')
              }
              resolve()
            } catch (error) { reject(error) }
          })
          observer.observe(document.body, { childList: true })
          document.body.append(topProbe)
        })
        topProbe.remove()
        for (const key of Object.keys(counts)) counts[key] = 0
        globalThis.__ylcPerformance = { counts, reset() { for (const key of Object.keys(counts)) counts[key] = 0 } }
        return true
      })()`,
    })
    assert(!result.exceptionDetails, `Performance instrumentation failed: ${result.exceptionDetails?.exception?.description ?? result.exceptionDetails?.text}`)
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
  let controlsPrecondition = null
  if (measureControls && instrumentation === 'counters') {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await readCounts(true)
    await page.evaluate(async () => {
      document.getElementById('performance-control').style.color = 'rgb(200, 200, 200)'
      document.getElementById('performance-control-text').firstChild.data = 'Control probe'
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    const counts = await readCounts(false)
    controlsPrecondition = { topRectReads: counts.topRectReads, topElementQueries: counts.topElementQueries }
    assert(counts.topRectReads > 0, 'The unpinned overlay must observe nested controls updates before measuring autoControls')
  }
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
    const runResults = {}
    if (measureChat) {
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
      Object.assign(runResults, { chatTraffic, repeatedSignals })
    }
    if (measureControls) {
      await readCounts(true)
      const controlsBefore = await metrics()
      await page.evaluate(async () => {
        const control = document.getElementById('performance-control')
        const text = document.getElementById('performance-control-text').firstChild
        for (let batch = 0; batch < 100; batch++) {
          // Keep obstacle geometry fixed while changing its nested UI.
          control.style.color = batch % 2 ? 'rgb(255, 255, 255)' : 'rgb(220, 220, 220)'
          text.data = `Control text ${batch % 2}`
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        }
      })
      runResults.autoControls = { ...await readCounts(false), ...delta(controlsBefore, await metrics()) }
    }
    results.push(runResults)
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  await page.screenshot({ path: outputPath.endsWith('.json') ? outputPath.slice(0, -5) + '.png' : outputPath + '.png' })
  const report = {
    capturedAt: new Date().toISOString(), platform: `${os.platform()} ${os.release()} ${os.arch()}`, instrumentation,
    browser: context.browser().version(), extension, geometry, controlsPrecondition, membershipColor,
    contentSha256: createHash('sha256').update(fs.readFileSync(path.join(extensionPath, 'content-scripts/content.js'))).digest('hex'),
    workload: { name: workload, initialMessages: 1000, batches: 100, messagesPerBatch: measureChat ? 10 : 0, runs: 5,
      repeatedPageSignals: measureChat ? 100 : 0, nestedControlUpdates: measureControls ? 100 : 0, chromeShape,
      structure: 'header, message list with items, input after messages' },
    results,
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally {
  await context.close()
  fs.rmSync(profileDir, { recursive: true, force: true })
}
