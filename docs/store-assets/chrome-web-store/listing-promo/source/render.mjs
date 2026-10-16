import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const assetDirectory = path.dirname(sourceDirectory)
const composition = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'composition.json'), 'utf8'))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const relative = filename => path.relative(assetDirectory, filename).split(path.sep).join('/')
const dimensions = bytes => {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Expected a PNG.')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] }
}
if (process.argv.length > 2) throw new Error('Usage: node listing-promo/source/render.mjs')
if (composition.size.width !== 440 || composition.size.height !== 280) throw new Error('The listing tile must be 440 × 280.')
const illustrationPath = path.resolve(sourceDirectory, composition.illustration)
const illustrationSize = dimensions(await fs.readFile(illustrationPath))
if (Math.abs(illustrationSize.width / illustrationSize.height - 11 / 7) > 0.005)
  throw new Error('Illustration must fit the 11:7 tile without cropping.')
const exportDirectory = path.resolve(sourceDirectory, composition.exportDirectory)
await fs.mkdir(exportDirectory, { recursive: true })
const browser = await chromium.launch({ headless: true })
const exports = []
try {
  for (const scale of [1, 2, 0.5]) {
    const context = await browser.newContext({ viewport: composition.size, deviceScaleFactor: scale, reducedMotion: 'reduce' })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.addInitScript(value => {
        window.__PROMO_COMPOSITION__ = value
      }, composition)
      await page.goto(pathToFileURL(path.join(sourceDirectory, 'tile.html')).href)
      await page.waitForFunction(() => window.__PROMO_READY__ === true)
      if (errors.length) throw new Error(errors.join('\n'))
      const layout = await page.locator('#tile').evaluate(tile => {
        const bounds = tile.getBoundingClientRect()
        const heading = tile.querySelector('.headline').getBoundingClientRect()
        const icon = tile.querySelector('.icon').getBoundingClientRect()
        return {
          text: tile.querySelector('.headline').textContent,
          overflow:
            heading.left < bounds.left || heading.top < bounds.top || heading.right > bounds.right || heading.bottom > bounds.bottom,
          overlap: heading.right > icon.left && heading.left < icon.right && heading.bottom > icon.top && heading.top < icon.bottom,
          headlineBottom: heading.bottom - bounds.top,
        }
      })
      if (layout.text !== composition.headline.join('') || layout.overflow || layout.overlap || layout.headlineBottom > 84)
        throw new Error('Headline must fit the blank area without overlapping the icon or illustration.')
      const name = scale === 1 ? 'small-promo.png' : scale === 2 ? 'small-promo@2x.png' : 'preview-half.png'
      const filename = path.join(exportDirectory, name)
      const png = await page.locator('#tile').screenshot({ path: filename, animations: 'disabled', omitBackground: false })
      const size = dimensions(png)
      if (size.width !== 440 * scale || size.height !== 280 * scale || size.colorType !== 2)
        throw new Error('Export must have the expected dimensions and 24-bit RGB PNG format without alpha.')
      exports.push({ file: relative(filename), ...size, sha256: sha256(png) })
    } finally {
      await context.close()
    }
  }
  const sources = []
  for (const file of [
    'composition.json',
    'tile.html',
    'render.mjs',
    'prompt.md',
    composition.illustration,
    composition.icon,
    ...composition.fonts,
  ]) {
    const filename = path.resolve(sourceDirectory, file)
    sources.push({ file: relative(filename), sha256: sha256(await fs.readFile(filename)) })
  }
  const manifest = {
    status: 'draft',
    storePublication: 'not-applied',
    generatedAt: new Date().toISOString(),
    assetType: composition.assetType,
    imageGeneration: 'Built-in image_gen; original illustrative stream and simplified chat, not a real capture.',
    renderer: { browser: browser.version(), typography: 'Bundled Inter 500 with browser-synthesized bold; existing unmodified app icon.' },
    illustrationSize,
    sources,
    exports,
  }
  await fs.writeFile(path.join(exportDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(JSON.stringify({ exportDirectory, exports }, null, 2))
} finally {
  await browser.close()
}
