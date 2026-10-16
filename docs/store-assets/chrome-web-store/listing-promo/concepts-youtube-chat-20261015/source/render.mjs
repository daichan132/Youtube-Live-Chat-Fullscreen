import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const assetDirectory = path.dirname(sourceDirectory)
const exportDirectory = path.join(assetDirectory, 'exports')
const relative = filename => path.relative(assetDirectory, filename).split(path.sep).join('/')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const dimensions = bytes => {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Expected a PNG.')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] }
}
const names = [
  'YouTube風ダーク',
  '赤いタイポ × チャット',
  'YouTube風ライト',
  'VTuber配信',
  'チャットを主役に',
  'ネイティブ風の透過版',
  '白と赤のミニマル',
  'eスポーツ配信',
  'ライブのコミュニティ',
  '料理ライブ',
]
const mattes = ['#0f0f0f', '#ff0033', '#ffffff', '#0f0f0f', '#0f0f0f', '#1a242c', '#ffffff', '#0f0f0f', '#0f0f0f', '#0f0f0f']
if (process.argv.length > 2) throw new Error('Usage: node concepts-youtube-chat-20261015/source/render.mjs')
const concepts = []
const metadataFiles = []
const originalFiles = []
const prompts = [
  '# Ten YouTube-like live-chat promotional directions',
  '',
  'All originals were created using the built-in image_gen tool on 2026-10-15 (JST). Each main heading includes Fullscreen as one word and Live Chat as a phrase. Captured native YouTube chat was a style reference for the header, inline handle/message rows, round avatars and composer. Scenes and conversations are original promotional illustrations, not genuine product screenshots. Exact generation and recomposition prompts follow.',
]
for (let n = 1; n <= 10; n += 1) {
  const id = String(n).padStart(2, '0')
  const metadataPath = path.join(assetDirectory, 'metadata', `${id}.json`)
  const originalPath = path.join(assetDirectory, 'originals', `${id}.png`)
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
  const original = await fs.readFile(originalPath)
  const size = dimensions(original)
  if (String(metadata.id).padStart(2, '0') !== id || !metadata.headline || !metadata.prompt)
    throw new Error(`Missing concept metadata: ${id}`)
  if (!/\bfullscreen\b/i.test(metadata.headline) || !/\blive\s+chat\b/i.test(metadata.headline))
    throw new Error(`Concept ${id} must use Fullscreen as one word and Live Chat in its main headline.`)
  if (size.width < 880 || size.height < 560 || Math.abs(size.width / size.height / (11 / 7) - 1) > 0.01)
    throw new Error(`Concept ${id} must be near 11:7 and large enough for review without crop or stretch.`)
  concepts.push({
    id,
    nameJa: names[n - 1],
    headline: metadata.headline,
    conceptNote: metadata.conceptNote,
    uiTreatment: 'YouTube-like native live chat',
    originalPath: relative(originalPath),
    originalSize: size,
    originalSha256: sha256(original),
  })
  metadataFiles.push(metadataPath)
  originalFiles.push(originalPath)
  prompts.push('', `## ${id} — ${names[n - 1]}`)
  for (const [key, value] of Object.entries(metadata)) {
    if (!/prompt/i.test(key)) continue
    prompts.push('', `### ${key}`, '')
    for (const prompt of Array.isArray(value) ? value : [value]) {
      if (typeof prompt === 'string') prompts.push('```text', prompt, '```', '')
    }
  }
}
const conceptsPath = path.join(assetDirectory, 'concepts.json')
const promptsPath = path.join(assetDirectory, 'prompts.md')
await fs.writeFile(conceptsPath, `${JSON.stringify(concepts, null, 2)}\n`)
await fs.writeFile(promptsPath, `${prompts.join('\n')}\n`)
const template = await fs.readFile(path.join(sourceDirectory, 'gallery.html'), 'utf8')
const inline = `<script>window.__CONCEPTS__=${JSON.stringify(concepts).replaceAll('<', '\\u003c')};window.__CONCEPT_EXPORTS__='./exports/';</script>\n`
const indexPath = path.join(assetDirectory, 'index.html')
await fs.writeFile(indexPath, template.replace('<script type="module">', `${inline}<script type="module">`))
await fs.mkdir(exportDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const exports = []
const record = async (filename, png, expectedWidth, expectedHeight) => {
  const size = dimensions(png)
  if (size.width !== expectedWidth || size.height !== expectedHeight || size.colorType !== 2)
    throw new Error(`Invalid opaque RGB PNG: ${filename}`)
  exports.push({ file: relative(filename), ...size, sha256: sha256(png) })
}
try {
  for (const scale of [1, 2, 0.5]) {
    const context = await browser.newContext({ viewport: { width: 440, height: 280 }, deviceScaleFactor: scale, reducedMotion: 'reduce' })
    try {
      for (const [index, concept] of concepts.entries()) {
        const page = await context.newPage()
        const errors = []
        page.on('pageerror', error => errors.push(error.message))
        try {
          const imageUrl = pathToFileURL(path.join(assetDirectory, concept.originalPath)).href
          await page.addInitScript(
            ({ imageUrl, concept, color }) => {
              window.__CONCEPT_IMAGE__ = imageUrl
              window.__CONCEPT_NAME__ = concept.nameJa
              window.__CONCEPT_COLOR__ = color
            },
            { imageUrl, concept, color: mattes[index] },
          )
          await page.goto(pathToFileURL(path.join(sourceDirectory, 'tile.html')).href)
          await page.waitForFunction(() => window.__CONCEPT_READY__ === true)
          if (errors.length) throw new Error(errors.join('\n'))
          if ((await page.locator('#artwork').evaluate(image => image.currentSrc)) !== imageUrl)
            throw new Error(`Wrong original selected for concept ${concept.id}`)
          const suffix = scale === 1 ? '' : scale === 2 ? '@2x' : '-half'
          const filename = path.join(exportDirectory, `${concept.id}${suffix}.png`)
          const png = await page.locator('#artwork').screenshot({ path: filename, animations: 'disabled', omitBackground: false })
          await record(filename, png, 440 * scale, 280 * scale)
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
    }
  }
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  try {
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      window.__EXPORT_MODE__ = true
    })
    await page.goto(pathToFileURL(indexPath).href)
    await page.waitForFunction(() => window.__GALLERY_READY__ === true || Boolean(window.__GALLERY_ERROR__))
    const galleryError = await page.evaluate(() => window.__GALLERY_ERROR__)
    if (galleryError || errors.length) throw new Error(galleryError || errors.join('\n'))
    const count = await page.locator('.concept').count()
    const bounds = await page.locator('#comparison').boundingBox()
    if (count !== 10 || !bounds || bounds.width !== 1000) throw new Error('Comparison must show all 10 concepts on a 1000 px sheet.')
    const filename = path.join(exportDirectory, 'comparison.png')
    const png = await page.locator('#comparison').screenshot({ path: filename, animations: 'disabled', omitBackground: false })
    await record(filename, png, 1000, Math.round(bounds.height))
    await page.evaluate(() => {
      document.querySelectorAll('.concept').forEach((node, index) => {
        if (index % 2 === 1) node.style.display = 'none'
      })
      document.querySelector('.comparison-heading h1').textContent = '奇数番号の5案'
      document.querySelector('.grid').style.gridTemplateColumns = '440px'
      document.querySelector('#comparison').style.width = '520px'
      document.querySelector('#comparison').style.minWidth = '520px'
      document.querySelector('#comparison').style.maxWidth = '520px'
    })
    const oddBounds = await page.locator('#comparison').boundingBox()
    const oddPath = path.join(exportDirectory, 'comparison-odd.png')
    await record(
      oddPath,
      await page.locator('#comparison').screenshot({ path: oddPath, animations: 'disabled' }),
      520,
      Math.round(oddBounds.height),
    )
    await page.evaluate(() => {
      document.querySelectorAll('.concept').forEach((node, index) => {
        node.style.display = index % 2 === 0 ? 'none' : ''
      })
      document.querySelector('.comparison-heading h1').textContent = '偶数番号の5案'
    })
    const evenBounds = await page.locator('#comparison').boundingBox()
    const evenPath = path.join(exportDirectory, 'comparison-even.png')
    await record(
      evenPath,
      await page.locator('#comparison').screenshot({ path: evenPath, animations: 'disabled' }),
      520,
      Math.round(evenBounds.height),
    )
  } finally {
    await context.close()
  }
  const galleryContext = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })
  try {
    const page = await galleryContext.newPage()
    await page.goto(pathToFileURL(indexPath).href)
    await page.waitForFunction(() => window.__GALLERY_READY__ === true)
    await page.locator('[data-size="half"]').click()
    const half = await page.locator('.artwork img').first().boundingBox()
    if (half.width !== 220 || half.height !== 140) throw new Error('Half-size comparison must display real 220 × 140 images.')
    await page.locator('.artwork').nth(3).click()
    await page.locator('dialog[open] .modal-image').evaluate(image => image.decode())
    if (!(await page.locator('.modal-image').getAttribute('src')).endsWith('/04@2x.png'))
      throw new Error('Expanded view must select the requested larger export.')
    await page.keyboard.press('Escape')
    if (await page.locator('dialog[open]').count()) throw new Error('Escape must close the expanded view.')
    await page.locator('[data-size="full"]').click()
    const full = await page.locator('.artwork img').first().boundingBox()
    if (full.width !== 440 || full.height !== 280) throw new Error('Normal comparison must restore 440 × 280 images.')
    await page.setViewportSize({ width: 375, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      throw new Error('Gallery must fit a narrow mobile viewport.')
  } finally {
    await galleryContext.close()
  }
  const sources = []
  for (const filename of [
    ...metadataFiles,
    ...originalFiles,
    conceptsPath,
    promptsPath,
    indexPath,
    ...['render.mjs', 'gallery.html', 'tile.html'].map(file => path.join(sourceDirectory, file)),
  ])
    sources.push({ file: relative(filename), sha256: sha256(await fs.readFile(filename)) })
  const manifest = {
    status: 'design-exploration',
    selectedConcept: null,
    storePublication: 'not-applied',
    generatedAt: new Date().toISOString(),
    imageGeneration:
      'Ten concepts made with built-in image_gen, using native YouTube chat anatomy as a style reference. Original scenes and fictional conversations; promotional illustrations, not real captures.',
    rendering:
      'Whole originals uniformly fitted; no source crops, repainting, stretching or new baked text. 440 × 280 upload candidates, 880 × 560 review images and 220 × 140 previews.',
    renderer: { browser: browser.version(), platform: process.platform },
    conceptCount: concepts.length,
    requiredHeadlineWords: ['Fullscreen', 'Live Chat'],
    uiDirection:
      'Top chat header; small round avatars; muted handles and inline message text; native-like composer, smiley and send control.',
    galleryChecks: {
      halfSizeToggle: 'passed',
      expandedExportIdentity: 'passed',
      escapeClose: 'passed',
      fullSizeRestore: 'passed',
      mobile375px: 'passed',
    },
    sources,
    exports,
  }
  await fs.writeFile(path.join(exportDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    JSON.stringify(
      {
        conceptCount: concepts.length,
        exportCount: exports.length,
        comparison: exports.find(item => item.file.endsWith('/comparison.png')),
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
