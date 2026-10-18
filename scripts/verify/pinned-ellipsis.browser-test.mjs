import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { build } from 'vite'
import { decodePng } from '../../e2e/visual/pixelMetrics.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const styleDirectory = path.join(root, 'entrypoints/content/features/YTDLiveChatIframe/styles')
const index = await readFile(path.join(styleDirectory, 'index.ts'), 'utf8')
const moduleList = index.match(/export const iframeStyleModuleNames = \[([\s\S]*?)\] as const/)?.[1]
assert(moduleList, 'The iframe stylesheet module contract must remain discoverable.')
const moduleNames = Array.from(moduleList.matchAll(/'([a-z-]+\.css)'/g), match => match[1])
assert.equal(moduleNames.length, 10, 'Exercise all ten production iframe stylesheet modules.')
assert.equal(new Set(moduleNames).size, moduleNames.length)
assert.equal(moduleList.replace(/'[a-z-]+\.css'|[\s,]/g, ''), '', 'Unexpected iframe module-list syntax.')
const productionCss = (await Promise.all(moduleNames.map(name => readFile(path.join(styleDirectory, name), 'utf8')))).join('\n')
const runtime = await build({
  configFile: false,
  root,
  logLevel: 'silent',
  resolve: { alias: { '@': root } },
  define: { 'import.meta.env.FIREFOX': 'false' },
  build: {
    write: false,
    minify: false,
    lib: { entry: path.join(root, 'entrypoints/content/style/applyStylePatch.ts'), formats: ['iife'], name: 'YlcPinnedEllipsisRuntime' },
  },
})
const chunks = (Array.isArray(runtime) ? runtime : [runtime]).flatMap(output => output.output).filter(output => output.type === 'chunk')
assert.equal(chunks.length, 1, 'Bundle the real style entry as one in-memory browser script.')

const background = [80, 90, 105]
const nativeColor = [15, 15, 15]
const clip = { x: 16 + 344 - 32, y: 16, width: 32, height: 40 }
const stages = [
  ['white', 'rgb(255, 255, 255)'],
  ['magenta', 'rgba(220, 80, 180, 0.6)'],
  ['dark', 'rgb(15, 15, 15)'],
]
const html = (referenceColor = null) => `<!doctype html>
  <html style="--yt-live-chat-primary-text-color:rgb(15,15,15);
    --extension-yt-live-secondary-font-color:rgb(255,255,255);--extension-yt-live-link-color:rgb(9,95,212);
    --extension-yt-live-control-background-color:transparent">
  <head><meta charset="utf-8"><style>
    /* Observed native rule: the owner supplies the ellipsis color separately
       from its message child. Commit a native-black frame before loading YLC. */
    yt-live-chat-text-message-renderer[in-collapsed-banner] #content.yt-live-chat-text-message-renderer {
      color:var(--yt-live-chat-primary-text-color);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;
    }
  </style><style id="production-css"></style><style>
    html,body { margin:0!important;padding:0!important;background:rgb(80,90,105)!important; }
    yt-live-chat-banner-renderer,yt-live-chat-text-message-renderer { display:block; }
    yt-live-chat-banner-renderer { position:absolute;left:16px;top:16px;background:transparent!important; }
    #content { width:344px;height:40px;box-sizing:content-box;font:32px/40px Arial;letter-spacing:0; }
    #message { color:${referenceColor ?? 'rgb(255,255,255)'}; }
    a { color:rgb(9,95,212); }
    [data-badge] { color:rgb(128,0,255); }
  </style></head><body ${referenceColor ? '' : 'class="custom-yt-app-live-chat-extension"'}>
    <yt-live-chat-banner-renderer><div id="contents">
      <yt-live-chat-text-message-renderer in-collapsed-banner>
        <div id="content" class="yt-live-chat-text-message-renderer" ${referenceColor ? `style="color:${referenceColor}"` : ''}>
          <span id="message-container"><span id="message" class="yt-live-chat-text-message-renderer"><span data-badge>◆</span> Pinned sample text <a href="https://example.invalid/reference/long-continuous-fixture-reference">https://example.invalid/reference/long-continuous-fixture-reference</a></span></span>
        </div>
      </yt-live-chat-text-message-renderer>
    </div></yt-live-chat-banner-renderer>
  </body></html>`

const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
const rgb = (image, pixel) => Array.from(image.pixels.subarray(pixel * image.channels, pixel * image.channels + 3))
const distance = (left, right) => Math.max(...left.map((value, channel) => Math.abs(value - right[channel])))
const compare = (actual, reference) => {
  assert.deepEqual([actual.width, actual.height], [clip.width, clip.height])
  assert.deepEqual([reference.width, reference.height], [clip.width, clip.height])
  let glyphPixels = 0
  let differentPixels = 0
  let nativeBlackPixels = 0
  for (let pixel = 0; pixel < actual.width * actual.height; pixel += 1) {
    const expected = rgb(reference, pixel)
    const received = rgb(actual, pixel)
    if (distance(expected, background) > 2) glyphPixels += 1
    if (distance(received, expected) > 2) differentPixels += 1
    if (distance(received, nativeColor) <= 2) nativeBlackPixels += 1
  }
  assert(glyphPixels >= 14, 'A reference must contain a visible ellipsis, never an empty green crop.')
  return { glyphPixels, differentPixels, nativeBlackPixels }
}

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 640, height: 160 }, deviceScaleFactor: 1 })
  await context.route('**/*', route => route.abort())
  const actual = await context.newPage()
  const reference = await context.newPage()
  const capture = async page => decodePng(await page.screenshot({ clip }))
  const freshReference = async color => {
    // Recreate the reference document for every state. Recoloring an existing
    // reference would give Chromium the same stale-ellipsis cache as the target.
    await reference.setContent(html(color))
    await settle(reference)
    return capture(reference)
  }
  await actual.setContent(html())
  await settle(actual)
  const initial = await actual.evaluate(() => {
    const owner = document.querySelector('#content')
    window.pinnedEllipsisOwner = owner
    window.pinnedEllipsisText = owner.textContent
    const { x, y, width, height } = owner.getBoundingClientRect()
    return { x, y, width, height }
  })
  assert.deepEqual(initial, { x: 16, y: 16, width: 344, height: 40 })
  const negative = compare(await capture(actual), await freshReference(stages[0][1]))
  assert(negative.differentPixels >= 14, 'Native-only CSS with a white child must fail the pixel oracle.')
  assert(negative.nativeBlackPixels >= 14, 'The negative control must paint a real native-black ellipsis.')

  await actual.addScriptTag({ content: chunks[0].code })
  await actual.evaluate(css => {
    document.querySelector('#production-css').textContent = css
  }, productionCss)
  const results = []
  for (const [name, color] of stages) {
    await actual.evaluate(value => {
      window.YlcPinnedEllipsisRuntime.applyStylePatch(document, {
        documentProperties: { '--extension-yt-live-font-color': value },
        bodyProperties: {},
        fontFamily: null,
      })
    }, color)
    await settle(actual)
    const state = await actual.evaluate(() => {
      const owner = document.querySelector('#content')
      const style = getComputedStyle(owner)
      const { x, y, width, height } = owner.getBoundingClientRect()
      const semanticColors = Array.from(owner.querySelectorAll('a,[data-badge]'), element => {
        const computed = getComputedStyle(element)
        return { color: computed.color, fill: computed.webkitTextFillColor }
      })
      return {
        sameOwner: owner === window.pinnedEllipsisOwner,
        sameText: owner.textContent === window.pinnedEllipsisText,
        bounds: { x, y, width, height },
        color: style.color,
        clipping: [style.overflow, style.whiteSpace, style.textOverflow],
        overflow: owner.scrollWidth > owner.clientWidth,
        semanticColors,
      }
    })
    assert(state.sameOwner && state.sameText, 'Never recreate or replace the target to make its paint pass.')
    assert.deepEqual(state.bounds, initial, 'Do not resize the target to clear its cache.')
    assert.deepEqual(state.clipping, ['hidden', 'nowrap', 'ellipsis'])
    assert(state.overflow, 'The same long text must still require an ellipsis.')
    assert.equal(state.color, color)
    assert.deepEqual(state.semanticColors, [
      { color: 'rgb(128, 0, 255)', fill: 'rgb(128, 0, 255)' },
      { color: 'rgb(9, 95, 212)', fill: 'rgb(9, 95, 212)' },
    ])
    results.push({ name, ...compare(await capture(actual), await freshReference(color)) })
    const unchangedReads = await actual.evaluate(value => {
      const owner = document.querySelector('#content')
      const nativeWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth').get
      let reads = 0
      Object.defineProperty(owner, 'offsetWidth', {
        configurable: true,
        get: () => {
          reads += 1
          return nativeWidth.call(owner)
        },
      })
      try {
        window.YlcPinnedEllipsisRuntime.applyStylePatch(document, {
          documentProperties: { '--extension-yt-live-font-color': value },
          bodyProperties: {},
          fontFamily: null,
        })
      } finally {
        Reflect.deleteProperty(owner, 'offsetWidth')
      }
      return reads
    }, color)
    assert.equal(unchangedReads, 0, 'An unchanged style patch must not force ellipsis layout again.')
  }
  assert.equal(results.length, 3, 'White, magenta and dark must all execute on the same target DOM.')
  console.log(JSON.stringify({ browser: browser.version(), negative, results }))
  assert(
    results.every(result => result.differentPixels === 0),
    'Pinned ellipsis pixels must match each fresh configured-color reference.',
  )
} finally {
  await browser.close()
}
