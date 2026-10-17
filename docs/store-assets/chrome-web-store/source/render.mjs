import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const assetDirectory = path.dirname(sourceDirectory)
const outputSizes = new Map([
  ['screenshots/01-introduction.png', [1280, 800]],
  ['screenshots/02-default-chat.png', [1280, 800]],
  ['screenshots/03-transparent-chat.png', [1280, 800]],
  ['screenshots/04-custom-style.png', [1280, 800]],
  ['promotional/small-promo.png', [440, 280]],
  ['promotional/marquee.png', [1400, 560]],
])
const nativeScreenshots = [
  { file: 'screenshots/02-default-chat.png', input: 'source/captures/default-chat.png', heading: 'Default chat', credit: 'Kazama Iroha' },
  {
    file: 'screenshots/03-transparent-chat.png',
    input: 'source/captures/transparent-chat.png',
    heading: 'Transparent chat',
    credit: 'CohhCarnage',
  },
  { file: 'screenshots/04-custom-style.png', input: 'source/captures/custom-style.png', heading: 'Custom style', credit: 'DrLupo' },
]
const requiredSources = [
  ...nativeScreenshots.map(({ input }) => input),
  'source/indigo-original.png',
  'source/marquee-original.png',
  'source/introduction.html',
  'source/fonts/inter-500.woff2',
]
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const pngProperties = bytes => {
  assert(bytes.length >= 26 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Expected a PNG file')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] }
}
const assetPath = file => {
  assert(typeof file === 'string' && !path.isAbsolute(file), `Expected an asset-relative path: ${file}`)
  const resolved = path.resolve(assetDirectory, file)
  assert(resolved.startsWith(`${assetDirectory}${path.sep}`), `Path leaves the asset directory: ${file}`)
  return resolved
}
const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
let requestedOutput
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--check') continue
  assert(args[index] === '--out' && args[index + 1], 'Usage: yarn store:assets:render [--check | --out <preview-directory>]')
  assert(!requestedOutput && !checkOnly, '--check and --out cannot be combined')
  requestedOutput = path.resolve(args[++index])
}

const manifest = JSON.parse(await fs.readFile(path.join(assetDirectory, 'manifest.json'), 'utf8'))
assert(Array.isArray(manifest.outputs) && Array.isArray(manifest.sources), 'Manifest requires outputs and sources')
assert.deepEqual(
  manifest.outputs.map(({ file }) => file).sort(),
  [...outputSizes.keys()].sort(),
  'Manifest must list exactly the six selected outputs',
)
const declaredSources = new Set(manifest.sources.map(({ file }) => file))
assert.equal(declaredSources.size, manifest.sources.length, 'Source entries must be unique')
for (const file of requiredSources) assert(declaredSources.has(file), `Required selected source is missing from manifest: ${file}`)

const changedSources = []
for (const entry of [...manifest.outputs, ...manifest.sources]) {
  assert(/^[a-f0-9]{64}$/.test(entry.sha256), `Missing SHA-256: ${entry.file}`)
  const bytes = await fs.readFile(assetPath(entry.file))
  const matches = sha256(bytes) === entry.sha256
  if (outputSizes.has(entry.file) || checkOnly) assert(matches, `SHA-256 mismatch: ${entry.file}`)
  else if (!matches) changedSources.push(entry.file)
  if (!entry.file.endsWith('.png')) continue
  const actual = pngProperties(bytes)
  const size = outputSizes.get(entry.file) ?? (entry.width && entry.height ? [entry.width, entry.height] : null)
  if (size) assert.deepEqual([actual.width, actual.height], size, `PNG dimensions changed: ${entry.file}`)
  if (outputSizes.has(entry.file)) {
    assert.deepEqual([entry.width, entry.height], size, `Manifest dimensions changed: ${entry.file}`)
    assert.equal(actual.colorType, 2, `Selected upload must be an opaque RGB PNG: ${entry.file}`)
  }
}
for (const { input } of nativeScreenshots) {
  const { width, height } = pngProperties(await fs.readFile(assetPath(input)))
  assert.deepEqual([width, height], [1920, 1080], `Expected a complete 1920 × 1080 native capture: ${input}`)
}
if (checkOnly) {
  console.log(
    `Verified ${manifest.outputs.length} selected output hashes, dimensions and RGB format; ${manifest.sources.length} selected source hashes and required inputs. No browser or extension was launched.`,
  )
  process.exit(0)
}

const outputDirectory = requestedOutput ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'ylc-store-assets-preview-')))
assert(
  outputDirectory !== assetDirectory && !outputDirectory.startsWith(`${assetDirectory}${path.sep}`),
  'Render previews outside the selected asset directory',
)
await fs.mkdir(outputDirectory, { recursive: true })
const { chromium } = await import('@playwright/test')
const browser = await chromium.launch({ headless: true })
const previewOutputs = []
const record = async (file, bytes) => {
  const { width, height, colorType } = pngProperties(bytes)
  assert.deepEqual([width, height], outputSizes.get(file), `Preview dimensions changed: ${file}`)
  assert.equal(colorType, 2, `Preview must be an opaque RGB PNG: ${file}`)
  const selected = manifest.outputs.find(entry => entry.file === file)
  previewOutputs.push({ file, width, height, sha256: sha256(bytes), matchesSelectedBytes: sha256(bytes) === selected.sha256 })
}
const outputPath = async file => {
  const destination = path.join(outputDirectory, file)
  await fs.mkdir(path.dirname(destination), { recursive: true })
  return destination
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  const resourceFailures = []
  page.on('pageerror', error => resourceFailures.push(error.message))
  page.on('requestfailed', request => resourceFailures.push(request.url()))
  const ready = () =>
    page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all([...document.images].map(image => image.decode()))
    })

  await page.goto(pathToFileURL(path.join(sourceDirectory, 'introduction.html')).href)
  await ready()
  const intro = await page.evaluate(() => {
    const canvas = document.getElementById('artwork').getBoundingClientRect()
    const title = document.querySelector('.title').getBoundingClientRect()
    const illustration = document.querySelector('.illustration').getBoundingClientRect()
    return {
      width: canvas.width,
      height: canvas.height,
      titleRight: title.right,
      titleBottom: title.bottom,
      illustrationBottom: illustration.bottom,
      fontLoaded: [...document.fonts].some(font => font.family === 'Inter' && font.status === 'loaded'),
    }
  })
  assert(
    intro.width === 1280 &&
      intro.height === 800 &&
      intro.fontLoaded &&
      intro.titleRight <= 790 &&
      intro.titleBottom <= 700 &&
      intro.illustrationBottom <= 800,
    'Introduction layout or font failed',
  )
  const introFile = 'screenshots/01-introduction.png'
  await record(introFile, await page.locator('#artwork').screenshot({ path: await outputPath(introFile), animations: 'disabled' }))

  const font = `data:font/woff2;base64,${(await fs.readFile(path.join(sourceDirectory, 'fonts/inter-500.woff2'))).toString('base64')}`
  for (const spec of nativeScreenshots) {
    const image = `data:image/png;base64,${(await fs.readFile(assetPath(spec.input))).toString('base64')}`
    await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('${font}');font-weight:500;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:1280px;height:800px;overflow:hidden;font-family:Inter,Arial,sans-serif}
header{position:relative;height:80px;background:#141b32;color:#f8f7fc;display:flex;align-items:center;padding:0 32px;justify-content:space-between}
h1{margin:0;font-size:30px;font-weight:500;letter-spacing:-.8px}.credit{text-align:right;font-size:13px;color:#cbcce0;line-height:1.6}
.credit b{font-weight:500;color:#f8f7fc;font-size:14px}img{display:block;width:1280px;height:720px;object-fit:contain}
</style><header><h1>${spec.heading}</h1><div class="credit"><b>YouTube Live Chat Fullscreen</b><br>Public stream example · ${spec.credit}</div></header><img src="${image}" alt="${spec.heading}"></html>`)
    await ready()
    const layout = await page.evaluate(() => {
      const image = document.querySelector('img')
      const rect = image.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        nativeWidth: image.naturalWidth,
        nativeHeight: image.naturalHeight,
        headerOverflow: document.querySelector('header').scrollWidth > 1280,
        fontLoaded: [...document.fonts].some(font => font.family === 'Inter' && font.status === 'loaded'),
      }
    })
    assert(
      layout.x === 0 &&
        layout.y === 80 &&
        layout.width === 1280 &&
        layout.height === 720 &&
        layout.nativeWidth === 1920 &&
        layout.nativeHeight === 1080 &&
        !layout.headerOverflow &&
        layout.fontLoaded,
      `Screenshot layout failed: ${spec.file}`,
    )
    await record(spec.file, await page.screenshot({ path: await outputPath(spec.file), animations: 'disabled' }))
  }

  for (const [file, input] of [
    ['promotional/small-promo.png', 'source/indigo-original.png'],
    ['promotional/marquee.png', 'source/marquee-original.png'],
  ]) {
    const [width, height] = outputSizes.get(file)
    await page.setViewportSize({ width, height })
    const image = `data:image/png;base64,${(await fs.readFile(assetPath(input))).toString('base64')}`
    await page.setContent(
      `<!doctype html><html><style>html,body{margin:0;background:#f8f4ec}img{display:block;width:${width}px;height:${height}px;object-fit:contain}</style><img src="${image}" alt="Selected fullscreen chat illustration"></html>`,
    )
    await ready()
    await record(file, await page.screenshot({ path: await outputPath(file), animations: 'disabled' }))
  }
  assert.deepEqual(resourceFailures, [], 'Artwork resources failed to load')
  // Rendering artwork does not exercise the current extension or YouTube.
  await fs.writeFile(
    path.join(outputDirectory, 'render-report.json'),
    `${JSON.stringify(
      {
        kind: 'Artwork previews; selected outputs remain unchanged',
        browser: browser.version(),
        sourceChangesSinceSelection: changedSources,
        outputs: previewOutputs,
        verificationScope: 'Saved source composition only; no current extension, YouTube compatibility, or store publication check.',
      },
      null,
      2,
    )}\n`,
  )
  console.log(
    JSON.stringify({ previewDirectory: outputDirectory, sourceChangesSinceSelection: changedSources, outputs: previewOutputs }, null, 2),
  )
} finally {
  await browser.close()
}
