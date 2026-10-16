import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { createArtwork } from './artwork.mjs'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const assetDirectory = path.dirname(sourceDirectory)
const exportDirectory = path.join(assetDirectory, 'exports')
const vectorDirectory = path.join(assetDirectory, 'vectors')
const fontPath = path.resolve(sourceDirectory, '../../../source/fonts/inter-500.woff2')
const licensePath = path.resolve(sourceDirectory, '../../../source/fonts/LICENSE')
const relative = filename => path.relative(assetDirectory, filename).split(path.sep).join('/')
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const dimensions = bytes => {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Expected PNG.')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] }
}
if (process.argv.length > 2) throw new Error('Usage: node abstract-youtube-20261015/source/render.mjs')
await fs.mkdir(exportDirectory, { recursive: true })
await fs.mkdir(vectorDirectory, { recursive: true })
const artworks = createArtwork((await fs.readFile(fontPath)).toString('base64'))
if (artworks.length !== 10 || new Set(artworks.map(artwork => artwork.id)).size !== 10)
  throw new Error('Exactly ten distinct abstract diagrams are required.')
await fs.copyFile(licensePath, path.join(vectorDirectory, 'FONT-LICENSE.txt'))
const concepts = artworks.map(({ id, nameJa, conceptNote }) => ({ id, nameJa, headline: 'YouTube / Fullscreen / Live Chat', conceptNote }))
for (const artwork of artworks) {
  if (/<image\b|<filter\b|gradient|https?:/i.test(artwork.svg.replace('http://www.w3.org/2000/svg', '')))
    throw new Error('Artwork must contain only local text and flat vector geometry.')
  await fs.writeFile(path.join(vectorDirectory, `${artwork.id}.svg`), `${artwork.svg}\n`)
}
await fs.writeFile(path.join(assetDirectory, 'concepts.json'), `${JSON.stringify(concepts, null, 2)}\n`)
const template = await fs.readFile(path.join(sourceDirectory, 'gallery.html'), 'utf8')
const inline = `<script>window.__CONCEPTS__=${JSON.stringify(concepts).replaceAll('<', '\\u003c')};window.__CONCEPT_EXPORTS__='./exports/';</script>\n`
const indexPath = path.join(assetDirectory, 'index.html')
await fs.writeFile(indexPath, template.replace('<script type="module">', `${inline}<script type="module">`))
const browser = await chromium.launch({ headless: true })
const exports = []
const record = async (filename, bytes, width, height) => {
  const size = dimensions(bytes)
  if (size.width !== width || size.height !== height || size.colorType !== 2)
    throw new Error(`Wrong PNG dimensions or opaque RGB format: ${filename}`)
  exports.push({ file: relative(filename), ...size, sha256: sha256(bytes) })
}
try {
  for (const scale of [1, 2, 0.5]) {
    const context = await browser.newContext({ viewport: { width: 440, height: 280 }, deviceScaleFactor: scale, reducedMotion: 'reduce' })
    try {
      for (const artwork of artworks) {
        const page = await context.newPage()
        try {
          await page.setContent(
            `<!doctype html><html><head><style>body{margin:0}svg{display:block}</style></head><body>${artwork.svg}</body></html>`,
          )
          const loaded = await page.evaluate(async () => {
            const fonts = await document.fonts.load('500 32px YLCInter')
            await document.fonts.ready
            return fonts.length
          })
          if (!loaded) throw new Error('Bundled Inter font was not loaded.')
          const geometry = await page.locator('svg').evaluate(svg => {
            const headings = [...svg.querySelectorAll('[data-copy]')]
            const video = svg.querySelector('[data-video]').getBBox()
            const chat = svg.querySelector('[data-chat]').getBBox()
            return {
              words: headings.map(node => node.textContent),
              textOutside: headings.some(node => {
                const b = node.getBBox()
                return b.x < 16 || b.y < 12 || b.x + b.width > 424 || b.y + b.height > 268
              }),
              videoRatio: video.width / video.height,
              chatInset: Math.min(
                chat.x - video.x,
                chat.y - video.y,
                video.x + video.width - chat.x - chat.width,
                video.y + video.height - chat.y - chat.height,
              ),
              chatCoversCopy: headings.some(node => {
                const b = node.getBBox()
                return b.x < chat.x + chat.width && b.x + b.width > chat.x && b.y < chat.y + chat.height && b.y + b.height > chat.y
              }),
            }
          })
          if (
            geometry.words.length !== 3 ||
            !['YouTube', 'Fullscreen', 'Live Chat'].every(word => geometry.words.includes(word)) ||
            geometry.textOutside ||
            geometry.chatCoversCopy ||
            Math.abs(geometry.videoRatio - 16 / 9) > 0.0001 ||
            geometry.chatInset < 8
          )
            throw new Error(`Invalid text or in-video chat geometry: ${JSON.stringify({ id: artwork.id, ...geometry })}`)
          const suffix = scale === 1 ? '' : scale === 2 ? '@2x' : '-half'
          const filename = path.join(exportDirectory, `${artwork.id + suffix}.png`)
          const bytes = await page.locator('svg').screenshot({ path: filename, animations: 'disabled', omitBackground: false })
          await record(filename, bytes, 440 * scale, 280 * scale)
        } finally {
          await page.close()
        }
      }
    } finally {
      await context.close()
    }
  }
  const context = await browser.newContext({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 })
  try {
    const page = await context.newPage()
    await page.addInitScript(() => {
      window.__EXPORT_MODE__ = true
    })
    await page.goto(pathToFileURL(indexPath).href)
    await page.waitForFunction(() => window.__GALLERY_READY__ === true || Boolean(window.__GALLERY_ERROR__))
    if (await page.evaluate(() => window.__GALLERY_ERROR__)) throw new Error('Comparison images failed to load.')
    const bounds = await page.locator('#comparison').boundingBox()
    if ((await page.locator('.concept').count()) !== 10 || bounds.width !== 1000)
      throw new Error('Comparison must include all ten diagrams.')
    const filename = path.join(exportDirectory, 'comparison.png')
    await record(
      filename,
      await page.locator('#comparison').screenshot({ path: filename, animations: 'disabled' }),
      1000,
      Math.round(bounds.height),
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
    if (half.width !== 220 || half.height !== 140) throw new Error('Half-size view must be 220 × 140.')
    await page.locator('.artwork').first().click()
    await page.locator('dialog[open] .modal-image').evaluate(image => image.decode())
    if (!(await page.locator('.modal-image').getAttribute('src')).endsWith('/01@2x.png')) throw new Error('Wrong expanded image.')
    await page.keyboard.press('Escape')
    if (await page.locator('dialog[open]').count()) throw new Error('Escape must close the dialog.')
    await page.locator('[data-size="full"]').click()
    const full = await page.locator('.artwork img').first().boundingBox()
    if (full.width !== 440 || full.height !== 280) throw new Error('Full-size view must be 440 × 280.')
    await page.setViewportSize({ width: 375, height: 844 })
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile gallery overflow.')
  } finally {
    await galleryContext.close()
  }
  const sources = []
  for (const filename of [
    ...['artwork.mjs', 'variants-04-06.mjs', 'variants-07-09.mjs', 'render.mjs', 'gallery.html'].map(file =>
      path.join(sourceDirectory, file),
    ),
    ...artworks.map(artwork => path.join(vectorDirectory, `${artwork.id}.svg`)),
    path.join(vectorDirectory, 'FONT-LICENSE.txt'),
    fontPath,
    licensePath,
    path.join(assetDirectory, 'concepts.json'),
    indexPath,
  ])
    sources.push({ file: relative(filename), sha256: sha256(await fs.readFile(filename)) })
  const manifest = {
    status: 'design-exploration',
    selectedConcept: null,
    storePublication: 'not-applied',
    generatedAt: new Date().toISOString(),
    conceptCount: 10,
    artworkMethod:
      'Hand-authored SVG geometry and editable text. No image generation, screenshots, scenes, textures, gradients or shadows.',
    typography: 'Embedded bundled Inter 500 under SIL Open Font License.',
    requiredWords: ['YouTube', 'Fullscreen', 'Live Chat'],
    renderer: { browser: browser.version(), platform: process.platform },
    geometryChecks: {
      requiredWords: 'passed',
      textBounds: 'passed',
      aspect16to9: 'passed',
      chatInsideVideo: 'passed',
      noTextOverlap: 'passed',
    },
    galleryChecks: {
      halfSize: 'passed',
      expandedExportIdentity: 'passed',
      escapeClose: 'passed',
      fullSizeRestore: 'passed',
      mobile375px: 'passed',
    },
    sources,
    exports,
  }
  await fs.writeFile(path.join(exportDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(JSON.stringify({ conceptCount: 10, exportCount: exports.length, comparison: exports.at(-1) }, null, 2))
} finally {
  await browser.close()
}
