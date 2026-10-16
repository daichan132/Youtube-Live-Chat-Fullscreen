import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { compileYouTubeScenario } from '../../e2e/support/youtubeScenario/compiler.ts'

// Captures the production extension, with an explicitly synthetic YouTube surface.
// The extension's controls, settings, geometry and storage are never recreated.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const assets = path.join(root, 'docs/store-assets/chrome-web-store')
// Fixture generation must not replace genuine stream captures.
const output = path.join(assets, 'fixtures')
const extensionPath = path.join(root, '.output/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extensionPath, 'manifest.json'), 'utf8'))
assert(!JSON.stringify(manifest).includes('e2e'), 'A production build is required')
assert(!(await readdir(extensionPath)).some(name => name.includes('bridge')), 'Test bridges are forbidden')
const scene = await readFile(path.join(assets, 'source/scene-v2.png'))
const sceneData = `data:image/png;base64,${scene.toString('base64')}`
const viewport = { width: 1280, height: 720 }
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')
const checks = []
const captures = []
const passed = (language, name) => {
  checks.push({ language, name, result: 'passed' })
  console.log(`${language}: ${name} passed`)
}
const waitFor = async (read, predicate, label) => {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    const value = await read()
    if (predicate(value)) return value
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Timed out: ${label}`)
}
const messages = {
  en: ['Love the sound of the rain', 'Those reflections are beautiful', 'Perfect evening for a walk', 'The street lights look amazing', 'This is so relaxing', 'Rainy nights are my favorite', 'Such a cozy little street', 'Thanks for taking us along'],
}
const palette = ['#6ca6b0', '#c58ea1', '#acaf7b', '#d9a36d', '#8192ba', '#7ead99', '#b38eb2', '#d3b478']
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const chatHtml = (language, archive) => `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><style>
html,body{margin:0;width:100%;height:100%;font-family:Arial,"Hiragino Sans",sans-serif}
yt-live-chat-renderer{display:flex;flex-direction:column;width:100%;height:100%;color:#0f0f0f}
yt-live-chat-header-renderer{display:flex;align-items:center;justify-content:space-between;height:54px;flex:0 0 54px;padding:0 16px;box-sizing:border-box;border-bottom:1px solid #9993;font-size:14px;font-weight:600}
yt-live-chat-header-renderer span:last-child{font-size:22px;font-weight:400}
yt-live-chat-item-list-renderer{display:block;flex:1;overflow:hidden}
#items{padding:15px 14px;display:flex;flex-direction:column;gap:11px}
yt-live-chat-text-message-renderer{display:flex;align-items:flex-start;gap:10px;line-height:1.55;flex:0 0 auto}
#author-photo{display:block;flex:0 0 27px;width:27px;height:27px;border-radius:50%;margin-top:2px}
yt-live-chat-author-chip{display:inline;margin-right:8px;font-weight:600;font-size:.83em;opacity:.67}
#message{display:inline}
#input-panel{flex:0 0 79px;padding:12px 15px;box-sizing:border-box;border-top:1px solid #9993}
yt-live-chat-message-input-renderer{display:block}
#input{display:block;min-height:28px;padding:6px 0;border-bottom:1px solid #9998;outline:none;font-size:14px;opacity:.85}
.input-footer{display:flex;justify-content:space-between;margin-top:5px;font-size:11px;opacity:.55}
</style></head><body><yt-live-chat-renderer>
<yt-live-chat-header-renderer><span>${archive ? (language === 'ja' ? 'チャットのリプレイ' : 'Chat replay') : (language === 'ja' ? 'チャット' : 'Live chat')}</span><span>⋮</span></yt-live-chat-header-renderer>
<yt-live-chat-item-list-renderer><div id="items">${messages[language].map((message, index) => `<yt-live-chat-text-message-renderer class="yt-live-chat-text-message-renderer"><span id="author-photo" class="yt-live-chat-text-message-renderer" style="background:${palette[index]}"></span><div><yt-live-chat-author-chip class="yt-live-chat-text-message-renderer"><span id="author-name">${language === 'ja' ? '視聴者' : 'Viewer'} ${index + 1}</span></yt-live-chat-author-chip><span id="message" class="yt-live-chat-text-message-renderer">${escapeHtml(message)}</span></div></yt-live-chat-text-message-renderer>`).join('')}</div></yt-live-chat-item-list-renderer>
${archive ? '' : `<div id="input-panel"><yt-live-chat-message-input-renderer><div id="input" class="yt-live-chat-text-input-field-renderer" contenteditable="true" role="textbox" aria-label="${language === 'ja' ? 'デモのコメント入力' : 'Demo chat input'}">${language === 'ja' ? '今日も楽しみにしていました！' : 'Love these rainy evening walks!'}</div><div class="input-footer"><span>☺</span><span>${language === 'ja' ? 'デモ・未送信' : 'Demo · not sent'}　➤</span></div></yt-live-chat-message-input-renderer></div>`}
</yt-live-chat-renderer></body></html>`

const scenario = (language, archive) => {
  const state = {
    video: { id: archive ? 'ylc-store-archive-demo' : 'ylc-store-live-demo', title: 'YLC synthetic demonstration', mode: archive ? 'archive' : 'live' },
    page: { chatContainer: 'present', chatDimensions: 'standard' },
    fullscreen: false,
    chat: { mode: archive ? 'archive' : 'live', native: { state: 'playable' }, response: 'playable' },
  }
  const compiled = compileYouTubeScenario(state)
  const extra = `<style>#movie_player{width:100%;height:100vh;background-image:url('${sceneData}');background-size:cover;background-position:center}[data-ylc-player-boundary-probe]{display:none}.ytp-right-controls{right:20px;bottom:14px;gap:6px}.ytp-button{background:transparent;color:white;border:0;font-size:25px;cursor:pointer}.demo-controls{position:absolute;bottom:28px;left:28px;color:#ffffffdb;font:15px Arial}.demo-progress{position:absolute;bottom:12px;left:28px;right:28px;height:3px;background:#ffffff40}.demo-progress:before{content:'';display:block;height:3px;width:${archive ? '44' : '76'}%;background:#f0c68e}</style>`
  const watchHtml = compiled.watchHtml.replace('<head>', '<head><meta charset="utf-8">').replace('</head>', `${extra}</head>`).replace('>Full screen</button>', '>⛶</button>').replace('</body>', `<script>const controls=document.createElement('div');controls.className='demo-controls';controls.textContent=${JSON.stringify(archive ? 'Ⅱ　　18:42 / 42:00　　♫' : 'Ⅱ　　♫　　LIVE')};player.append(controls);const progress=document.createElement('div');progress.className='demo-progress';player.append(progress);</script></body>`)
  return { ...compiled, watchHtml, chatHtml: chatHtml(language, archive) }
}

const profile = await mkdtemp(path.join(os.tmpdir(), 'ylc-store-capture-'))
let context
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: chromium.executablePath(), headless: false, viewport, deviceScaleFactor: 1,
    locale: 'en-US', colorScheme: 'dark', ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`, '--mute-audio', '--no-first-run'],
  })
  const manager = await context.newPage()
  await manager.goto('chrome://extensions')
  const item = manager.locator('extensions-item').first()
  await item.waitFor({ timeout: 20000 })
  const identity = await item.evaluate(element => ({ id: element.data.id, version: element.data.version, path: element.data.path, location: element.data.location, enabled: element.data.state === 'ENABLED' }))
  assert.equal(identity.version, manifest.version)
  assert.equal(identity.path, extensionPath)
  assert(identity.enabled)
  passed('all', 'chrome-extensions-loaded-production-identity')
  const storagePage = await context.newPage()
  await storagePage.goto(`chrome-extension://${identity.id}/popup.html`)
  const page = await context.newPage()
  const overlay = page.locator('#shadow-root-live-chat [data-ylc-resizable]')
  const settings = () => page.frameLocator('#shadow-root-live-chat iframe[data-ylc-settings-frame]')
  const geometry = () => overlay.boundingBox()
  const styleState = () => page.evaluate(() => {
    const frame = document.getElementById('shadow-root-live-chat')?.shadowRoot?.querySelector('iframe:not([data-ylc-settings-frame])')
    const doc = frame?.contentDocument
    return doc ? { fontSize: doc.documentElement.style.getPropertyValue('--extension-yt-live-chat-font-size'), background: doc.documentElement.style.getPropertyValue('--extension-yt-live-chat-background-color'), messageFont: doc.defaultView.getComputedStyle(doc.querySelector('yt-live-chat-text-message-renderer')).fontSize } : null
  })
  const stored = key => storagePage.evaluate(async key => (await chrome.storage.local.get(key))[key]?.value, key)
  let activeScenario
  await context.route('https://www.youtube.com/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/watch') return route.fulfill({ contentType: 'text/html', body: activeScenario.watchHtml })
    if (url.pathname === '/live_chat' || url.pathname === '/live_chat_replay') return route.fulfill({ contentType: 'text/html', body: activeScenario.chatHtml })
    return route.fulfill({ status: 404, body: '' })
  })
  const enter = async () => {
    await page.locator('.ytp-fullscreen-button').click()
    await waitFor(() => page.evaluate(() => Boolean(document.fullscreenElement)), Boolean, 'real fullscreen')
    await page.setViewportSize(viewport)
    await overlay.waitFor({ state: 'visible', timeout: 20000 })
    await waitFor(styleState, value => Boolean(value?.fontSize), 'production chat styles')
    await page.frameLocator('#shadow-root-live-chat iframe:not([data-ylc-settings-frame])').locator('body').evaluate(() => document.fonts.ready)
  }
  const openSettings = async () => {
    await overlay.hover({ force: true })
    await page.locator('#shadow-root-live-chat [data-ylc-settings-btn]').click()
    await settings().getByRole('dialog').waitFor({ state: 'visible' })
    await settings().locator('body').evaluate(() => document.fonts.ready)
  }
  const closeSettings = async () => {
    await settings().locator('[data-ylc-setting-close-button]').click()
    await settings().getByRole('dialog').waitFor({ state: 'hidden' })
  }
  const settleSettingsPaint = async () => {
    await settings().locator('body').evaluate(async () => {
      await document.fonts.ready
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const selectSettingsTab = async name => {
    const tab = settings().getByRole('tab', { name, exact: true })
    await tab.click()
    await waitFor(() => tab.getAttribute('aria-selected'), value => value === 'true', 'selected production settings tab')
    await settleSettingsPaint()
  }
  const scrollSettingsToTop = async () => {
    const scroll = settings().locator('[data-ylc-setting-scroll-container]')
    const box = await scroll.boundingBox()
    assert(box, 'The product setting scroll region must be visible')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -3000)
    await settleSettingsPaint()
    await waitFor(() => scroll.evaluate(element => element.scrollTop), value => value === 0, 'actual settings wheel scroll')
  }
  const alignTextSettings = async () => {
    const scroll = settings().locator('[data-ylc-setting-scroll-container]')
    const heading = settings().getByRole('group', { name: 'Text', exact: true }).locator('legend')
    const [scrollBox, headingBox] = await Promise.all([scroll.boundingBox(), heading.boundingBox()])
    assert(scrollBox && headingBox, 'Text heading and scroll region must have actual browser pixels')
    const top = scrollBox.y + 16
    await page.mouse.move(scrollBox.x + scrollBox.width / 2, scrollBox.y + scrollBox.height / 2)
    await page.mouse.wheel(0, Math.round(headingBox.y - top))
    await settleSettingsPaint()
    await waitFor(() => heading.boundingBox(), value => value && Math.abs(value.y - top) < 2, 'Text section aligned by actual wheel input')
  }
  const gesture = async (target, dx, dy) => {
    await overlay.hover({ force: true })
    const box = await target.boundingBox()
    assert(box, 'Gesture target must have browser pixels')
    const x = box.x + box.width / 2
    const y = box.y + box.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + dx, y + dy, { steps: 20 })
    await page.mouse.up()
  }
  const place = async (language, x, y, width, height) => {
    const before = await geometry()
    if (Math.abs(width - before.width) > 1 || Math.abs(height - before.height) > 1) {
      await gesture(overlay.locator('[data-ylc-resize-direction="bottomRight"]'), width - before.width, height - before.height)
    }
    let resized = await geometry()
    assert(Math.abs(resized.width - width) < 2 && Math.abs(resized.height - height) < 2, 'Pointer resize must change actual geometry')
    await gesture(page.getByRole('button', { name: language === 'ja' ? 'ドラッグで移動' : 'Drag to move', exact: true }), x - resized.x, y - resized.y)
    const moved = await geometry()
    assert(Math.abs(moved.x - x) < 2 && Math.abs(moved.y - y) < 2, 'Pointer drag must reach requested position')
    await waitFor(() => stored('ylc-chat-geometry'), value => Boolean(value?.pinned), 'saved geometry')
    return moved
  }
  const snapshot = async (language, name, panel = false) => {
    const directory = path.join(output, 'inputs', language)
    await mkdir(directory, { recursive: true })
    await page.mouse.move(640, 690)
    await page.evaluate(() => document.fonts.ready)
    if (name.startsWith('settings') || name.startsWith('presets')) await settleSettingsPaint()
    const png = panel ? await settings().locator('.ylc-setting-panel').screenshot({ animations: 'disabled' }) : await page.screenshot({ animations: 'disabled' })
    const relative = `inputs/${language}/${name}.png`
    await writeFile(path.join(output, relative), png)
    captures.push({ file: relative, sha256: sha256(png), kind: panel ? 'unaltered-production-panel-crop' : 'production-extension-on-synthetic-demo', pixels: { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }, viewport: panel ? null : viewport })
    console.log(`captured ${relative}`)
  }
  for (const language of ['en']) {
    await storagePage.evaluate(async language => {
      await chrome.storage.local.clear()
      await chrome.storage.local.set({ 'ylc-locale': { schemaVersion: 1, writerId: 'store-capture-setup', value: language }, 'ylc-theme': { schemaVersion: 1, writerId: 'store-capture-setup', value: 'dark' } })
    }, language)
    activeScenario = scenario(language, false)
    await page.goto(activeScenario.watchUrl, { waitUntil: 'domcontentloaded' })
    await enter()
    assert.equal((await styleState()).fontSize, '13px')
    passed(language, 'initial-fullscreen-default-chat')
    const demoInput = page.frameLocator('#shadow-root-live-chat iframe:not([data-ylc-settings-frame])').getByRole('textbox', { name: language === 'ja' ? 'デモのコメント入力' : 'Demo chat input', exact: true })
    const draft = 'Love these rainy evening walks!'
    await demoInput.fill('')
    await demoInput.pressSequentially(draft, { delay: 15 })
    assert.equal(await demoInput.textContent(), draft)
    passed(language, 'keyboard-edits-isolated-unsent-demo-input')
    await openSettings()
    await selectSettingsTab(language === 'ja' ? 'プリセット' : 'Presets')
    await settings().locator('[data-ylc-preset-item="dark"] .ylc-preset-apply').click()
    await waitFor(styleState, value => value?.fontSize === '14px', 'dark preset actual rendering')
    assert.equal((await stored('ylc-chat-appearance')).profile.appearance.fontSize, 14)
    passed(language, 'preset-apply-and-save')
    await settings().getByRole('button', { name: language === 'ja' ? 'スタイル変更を元に戻す' : 'Undo style change', exact: true }).click()
    await waitFor(styleState, value => value?.fontSize === '13px', 'undo restores initial profile')
    passed(language, 'preset-undo-restores-profile')
    await settings().locator('[data-ylc-preset-item="dark"] .ylc-preset-apply').click()
    await selectSettingsTab(language === 'ja' ? '設定' : 'Settings')
    const slider = settings().getByRole('slider', { name: language === 'ja' ? 'フォントサイズ' : 'Text Size', exact: true })
    await slider.focus()
    await slider.press('Home')
    for (let n = 0; n < 7; n++) await slider.press('ArrowRight')
    assert.equal(await slider.inputValue(), '17')
    await waitFor(styleState, value => value?.fontSize === '17px' && value?.messageFont === '17px', 'font size applied to messages')
    await waitFor(() => stored('ylc-chat-appearance'), value => value?.profile.appearance.fontSize === 17, 'font setting persisted')
    await scrollSettingsToTop()
    await settings().getByRole('button', { name: 'Background Color', exact: true }).click()
    const saturation = settings().getByRole('slider', { name: 'Color', exact: true })
    await saturation.focus()
    // The product control adjusts saturation in 5% keyboard increments.
    // Keep the dark preset's brightness/alpha while removing its blue tint.
    for (let n = 0; n < 20; n++) await saturation.press('ArrowLeft')
    await waitFor(() => stored('ylc-chat-appearance'), value => {
      const color = value?.profile.appearance.backgroundColor
      return color && color.r < 25 && color.g < 25 && color.b < 25 && Math.abs(color.r - color.g) <= 1 && Math.abs(color.g - color.b) <= 1
    }, 'neutral near-black background saved through actual color picker')
    await settings().getByRole('button', { name: 'Background Color', exact: true }).click()
    await slider.focus()
    await alignTextSettings()
    passed(language, 'font-size-keyboard-input-and-rendered-save')
    await snapshot(language, 'settings-text')
    await snapshot(language, 'settings-text-panel', true)
    await scrollSettingsToTop()
    await snapshot(language, 'settings')
    await snapshot(language, 'settings-panel', true)
    await selectSettingsTab(language === 'ja' ? 'プリセット' : 'Presets')
    await scrollSettingsToTop()
    await snapshot(language, 'presets')
    await snapshot(language, 'presets-panel', true)
    await closeSettings()
    const right = await place(language, 830, 76, 400, 540)
    passed(language, 'pointer-resize-and-drag')
    await snapshot(language, 'position-right')
    await snapshot(language, 'overview')
    const saved = await stored('ylc-chat-geometry')
    await page.evaluate(() => document.exitFullscreen())
    await enter()
    const reentered = await geometry()
    for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(right[key] - reentered[key]) < 2)
    assert.equal((await styleState()).fontSize, '17px')
    passed(language, 'fullscreen-reentry-keeps-position-and-style')
    await page.evaluate(() => document.exitFullscreen())
    await page.reload({ waitUntil: 'domcontentloaded' })
    await enter()
    const reloaded = await geometry()
    for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(right[key] - reloaded[key]) < 2)
    assert.equal((await styleState()).fontSize, '17px')
    assert.deepEqual(await stored('ylc-chat-geometry'), saved)
    passed(language, 'reload-keeps-persisted-position-and-style')
    await place(language, 40, 76, 340, 400)
    passed(language, 'compact-left-position-actual-pointer-resize')
    await snapshot(language, 'position-left')
    await page.evaluate(() => document.exitFullscreen())
    activeScenario = scenario(language, true)
    await page.goto(activeScenario.watchUrl, { waitUntil: 'domcontentloaded' })
    await enter()
    await place(language, 830, 76, 400, 540)
    assert.equal(await page.locator('#shadow-root-live-chat iframe:not([data-ylc-settings-frame])').getAttribute('src').then(value => new URL(value, 'https://www.youtube.com').pathname), '/live_chat_replay')
    passed(language, 'archive-chat-replay-surface')
    await snapshot(language, 'archive')
    await page.evaluate(() => document.exitFullscreen())
  }
  const evidence = {
    schemaVersion: 1, capturedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    extension: { version: manifest.version, unpublishedCandidate: true, buildType: 'production', id: identity.id, managerIdentityVerified: true, manifestSha256: sha256(await readFile(path.join(extensionPath, 'manifest.json'))), contentSha256: sha256(await readFile(path.join(extensionPath, 'content-scripts/content.js'))), testBridgeLoaded: false },
    browser: { name: 'Google Chrome for Testing', version: context.browser().version(), headless: false, profile: 'disposable', viewport },
    provenance: { productUI: 'Actual production extension: overlay, drag/resize controls, settings iframe and preset panels.', syntheticDemo: 'AI-generated rainy city walking-tour scene, fictional messages and anonymous demo viewers on deterministic YouTube DOM fixtures. No real stream, account or submitted message.', compiler: 'e2e/support/youtubeScenario/compiler.ts', scene: '../source/scene-v2.png', sceneSha256: sha256(scene), sceneGeneration: 'Generated for these store assets with OpenAI ImageGen. The repository stores the original raster source.', setup: 'Only locale/theme are initialized in isolated storage. Appearance and geometry are changed through actual product UI.', publication: 'These candidate screenshots are not evidence of the currently published Chrome Web Store version or external YouTube compatibility. They do not establish real video playback, posting or payment.' },
    counts: { executed: checks.length, passed: checks.length, failed: 0, skipped: 0, retried: 0 }, checks, captures,
  }
  await writeFile(path.join(output, 'capture-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(`${checks.length} checks passed; ${captures.length} production captures saved`)
} finally {
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
