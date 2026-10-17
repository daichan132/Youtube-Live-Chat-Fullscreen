import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { compileYouTubeScenario } from '../../e2e/support/youtubeScenario/compiler.ts'
import { decodePng } from '../../e2e/visual/pixelMetrics.ts'
import { captureFullscreenSurface, hasUsableNativeComposer, resolveCapturePage } from './capture-support.mjs'
import { applyExtensionSettings } from './extension-settings.mjs'
import { createBackgroundPage, findLoadedExtension } from './verification-target.mjs'

// Offline fixture only: verifies native fullscreen, the production extension,
// and actual target-surface pixels without an OS window. Headless tab activation
// is temporary; the original active tab and focus emulation are restored.
const extensionPath = path.resolve('.output/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'))
assert(!JSON.stringify(manifest).includes('e2e'), 'Build the production extension before this test.')
const profile = await mkdtemp(path.join(os.tmpdir(), 'ylc-background-capture-'))
const compiled = compileYouTubeScenario({
  video: { id: 'background-capture-fixture', title: 'Offline capture fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'playable' }, response: 'playable' },
})
const video = `<script>
  const player = document.getElementById('movie_player');
  if (!player) throw new Error('Offline capture fixture is missing its player.');
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const paint = canvas.getContext('2d'); paint.fillStyle = 'rgb(18,80,160)'; paint.fillRect(0,0,640,360);
  const video = document.createElement('video'); video.className = 'html5-main-video';
  video.muted = true; video.autoplay = true; video.srcObject = canvas.captureStream(10);
  setInterval(() => paint.fillRect(0,0,640,360), 100);
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain';
  player.prepend(video); video.play();
</script>`
const watchHtml = compiled.watchHtml.replace('</body>', `${video}</body>`)
const chatHtml = compiled.chatRoutes[0].body
  .replace(
    '</head>',
    `<style>
html,body{margin:0;height:100%;background:transparent}
yt-live-chat-renderer{display:flex;flex-direction:column;height:100%}
yt-live-chat-item-list-renderer{display:block;flex:1}
#input-panel{height:96px;padding:12px;box-sizing:border-box}
#input{display:block;min-height:28px;border-bottom:1px solid white;outline:none}
</style></head>`,
  )
  .replace(
    '</yt-live-chat-renderer>',
    `<div id="input-panel"><yt-live-chat-message-input-renderer>
<div id="input" class="yt-live-chat-text-input-field-renderer" contenteditable="true" role="textbox" aria-label="Offline fixture composer"></div>
</yt-live-chat-message-input-renderer></div></yt-live-chat-renderer>`,
  )
const readState = () => {
  const root = document.getElementById('shadow-root-live-chat')?.shadowRoot
  const overlay = root?.querySelector('[data-ylc-resizable]')
  const rect = overlay?.getBoundingClientRect()
  const background = root?.querySelector('[data-ylc-chat-background]')
  const style = background ? getComputedStyle(background) : null
  const bounds = background?.getBoundingClientRect()
  return {
    fullscreen: Boolean(document.fullscreenElement),
    overlayMounted: Boolean(rect && rect.width > 0 && rect.height > 0),
    backgroundColor: style?.backgroundColor,
    backdropFilter: style?.backdropFilter,
    backgroundBounds: bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height } : null,
  }
}
let context
let browser
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, '--mute-audio'],
  })
  browser = context.browser()
  assert(browser, 'The persistent context must expose its browser connection.')
  await context.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.protocol === 'chrome-extension:') return route.continue()
    if (url.hostname !== 'www.youtube.com') return route.abort()
    if (url.pathname === '/watch') return route.fulfill({ contentType: 'text/html', body: watchHtml })
    const chat = compiled.chatRoutes.find(
      candidate => new URL(candidate.pattern.replaceAll('*', ''), 'https://www.youtube.com').pathname === url.pathname,
    )
    return chat ? route.fulfill({ contentType: 'text/html', body: chatHtml }) : route.fulfill({ status: 404, body: '' })
  })
  const identity = await findLoadedExtension(browser, extensionPath)
  assert.equal(identity.version, manifest.version)
  assert.equal(identity.enabled, true)

  const sentinel = await context.newPage()
  await sentinel.setContent('<html><body style="background:rgb(200,20,20)">Active sentinel tab</body></html>')
  await sentinel.bringToFront()
  const capture = await createBackgroundPage(browser, compiled.watchUrl)
  await capture.waitForLoadState('domcontentloaded')
  await applyExtensionSettings({
    page: capture,
    extensionId: identity.id,
    patch: {
      enabled: true,
      locale: 'en',
      theme: 'dark',
      profile: {
        appearance: { backgroundColor: { r: 0, g: 0, b: 0, a: 0.22 }, blur: 0 },
        display: { contentMode: 'full-chat', idleVisibility: 'always-visible' },
      },
      geometry: { reference: 'player', rect: { x: 0.6, y: 0.08, width: 0.3, height: 0.62 }, pinned: true },
    },
  })
  const selected = await resolveCapturePage(browser, { urlIncludes: 'youtube.com/watch' })
  assert.equal(selected.page, capture)
  const exact = await resolveCapturePage(browser, { targetId: selected.id })
  assert.equal(exact.page, capture)
  const sentinelFocusedBefore = await sentinel.evaluate(() => document.hasFocus())
  assert.equal(sentinelFocusedBefore, true, 'The non-capture tab must be active before background capture.')
  capture.bringToFront = () => {
    throw new Error('Background capture must not bring its target to front.')
  }

  const result = await captureFullscreenSurface(capture, {
    stateReader: readState,
    videoOnly: true,
    requireComposer: true,
    viewport: { width: 1600, height: 900 },
    timeout: 15000,
  })
  assert.equal(result.state.fullscreen, true)
  assert.equal(result.state.overlayMounted, true)
  assert.equal(result.state.backgroundColor, 'rgba(0, 0, 0, 0.22)')
  assert.equal(result.state.backdropFilter, 'none')
  assert.equal(result.state.composerAvailable, true)
  const composer = capture
    .frameLocator('#shadow-root-live-chat iframe:not([data-ylc-settings-frame])')
    .getByRole('textbox', { name: 'Offline fixture composer' })
  assert.equal(await composer.isVisible(), true, 'Full-chat mode must keep the real iframe composer visible.')
  assert.equal(await composer.isEditable(), true)
  assert.equal(result.method, 'headless-target-surface')
  assert.equal(await sentinel.evaluate(() => document.hasFocus()), true, 'The original active tab must regain focus.')
  const image = decodePng(result.png)
  assert.equal(image.width, 1600, 'The native PNG must retain the requested fullscreen width.')
  assert.equal(image.height, 900, 'The native PNG must retain the requested fullscreen height.')
  assert.equal(image.width, result.clip.width)
  assert.equal(image.height, result.clip.height)
  const offset = (Math.floor(image.height * 0.3) * image.width + Math.floor(image.width * 0.3)) * image.channels
  const actualPixel = Array.from(image.pixels.slice(offset, offset + 3))
  if (actualPixel.some((value, index) => Math.abs(value - [18, 80, 160][index]) >= 4)) {
    await writeFile('/private/tmp/ylc-background-fixture-failure.png', result.png)
  }
  for (const [index, expected] of [18, 80, 160].entries()) {
    assert(
      Math.abs(image.pixels[offset + index] - expected) < 4,
      `The screenshot must contain decoded target video pixels; got ${actualPixel}.`,
    )
  }
  const chatBounds = result.state.backgroundBounds
  const chatX = Math.floor(chatBounds.x + chatBounds.width * 0.5 - result.clip.x)
  const chatY = Math.floor(chatBounds.y + chatBounds.height * 0.25 - result.clip.y)
  const chatPixel = (chatY * image.width + chatX) * image.channels
  for (const [index, channel] of [18, 80, 160].entries()) {
    assert(
      Math.abs(image.pixels[chatPixel + index] - Math.round(channel * 0.78)) < 4,
      'The chat background pixels must blend alpha .22 over the decoded video.',
    )
  }
  assert.equal(await capture.evaluate(() => document.hasFocus()), false, 'Focus emulation must be cleared after capture.')
  await composer.evaluate(element => {
    const cover = element.ownerDocument.createElement('div')
    cover.setAttribute('data-capture-fixture-cover', '')
    cover.setAttribute('role', 'dialog')
    cover.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgb(30,30,30);pointer-events:auto'
    element.ownerDocument.body.append(cover)
  })
  assert.equal(await composer.isVisible(), true, 'The modal must cover an otherwise visible native input.')
  assert.equal(await composer.isEditable(), true, 'The modal must cover an otherwise editable native input.')
  assert.equal(await hasUsableNativeComposer(capture), false, 'A composer covered by a native frame modal must be rejected.')
  await composer.evaluate(element => element.ownerDocument.querySelector('[data-capture-fixture-cover]').remove())
  assert.equal(await hasUsableNativeComposer(capture), true, 'An uncovered native composer must become usable again.')
  await composer.evaluate(element => element.setAttribute('aria-disabled', 'true'))
  assert.equal(await hasUsableNativeComposer(capture), false, 'A disabled composer must be rejected.')
  await composer.evaluate(element => {
    element.removeAttribute('aria-disabled')
    element.setAttribute('contenteditable', 'false')
  })
  assert.equal(await hasUsableNativeComposer(capture), false, 'A read-only composer must be rejected.')
  await composer.evaluate(element => element.remove())
  assert.equal(await hasUsableNativeComposer(capture), false, 'Replay or sign-in surfaces without a composer must be rejected.')
  console.log(
    JSON.stringify({
      status: 'passed',
      productionVersion: identity.version,
      fullscreen: true,
      osWindowFree: true,
      activeTabRestored: true,
      configuredAlpha: 0.22,
      actualIframeComposerVisible: true,
      sourcePixelsVerified: true,
      translucentChatPixelsVerified: true,
      unavailableComposersRejected: true,
      coveredComposersRejected: true,
      pixels: { width: image.width, height: image.height },
    }),
  )
} finally {
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
