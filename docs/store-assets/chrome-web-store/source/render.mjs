import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const compositionPath = path.join(sourceDirectory, 'composition.json')
const composition = JSON.parse(await fs.readFile(compositionPath, 'utf8'))
const inputDirectory = path.resolve(sourceDirectory, composition.inputDirectory)
const exportDirectory = path.resolve(sourceDirectory, composition.exportDirectory)
const iconPath = path.resolve(sourceDirectory, composition.icon)
const evidencePath = path.resolve(sourceDirectory, composition.captureEvidence)
const relative = filename => path.relative(path.dirname(sourceDirectory), filename).split(path.sep).join('/')
const sha256 = content => createHash('sha256').update(content).digest('hex')
const exists = filename =>
  fs.access(filename).then(
    () => true,
    () => false,
  )
const args = process.argv.slice(2)
const locales = Object.keys(composition.locales)
const layouts = new Set(['overview', 'comparison', 'panel'])
const required = new Set()
const optionalPanels = new Set()
const promoSizes = new Map([
  ['small-promo', { width: 440, height: 280 }],
  ['marquee', { width: 1400, height: 560 }],
])
const validInput = input => /^[a-z0-9-]+\.(png|jpe?g)$/.test(input)
const imageDimensions = bytes => {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8) throw new Error('Capture must be a PNG or JPEG image.')
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) break
    while (bytes[offset] === 0xff) offset += 1
    const marker = bytes[offset++]
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > bytes.length) break
    const length = bytes.readUInt16BE(offset)
    if (length < 2 || offset + length > bytes.length) break
    if (frameMarkers.has(marker)) {
      if (length < 8) break
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) }
    }
    offset += length
  }
  throw new Error('JPEG capture has no valid frame dimensions.')
}

if (args.some(arg => arg !== '--check')) throw new Error('Usage: node source/render.mjs [--check]')
if (!locales.includes(composition.defaultLocale)) throw new Error('Default locale must have screenshot copy.')
if (
  ![composition.captureSize.width, composition.captureSize.height].every(value => Number.isInteger(value) && value > 0) ||
  composition.captureSize.width * 9 !== composition.captureSize.height * 16
)
  throw new Error('Capture dimensions must preserve the complete 16:9 video.')
if (composition.screenshotSize.width !== 1280 || composition.screenshotSize.height !== 800 || composition.headerHeight !== 80)
  throw new Error('Store screenshots must have an 80 px header above a complete 1280 × 720 video area.')
for (const [locale, copy] of Object.entries(composition.locales)) {
  if (!/^[a-z]{2}$/.test(locale) || copy.images.length < 1 || copy.images.length > 5)
    throw new Error(`Invalid locale or screenshot count (expected 1–5): ${locale}`)
  const ids = new Set()
  for (const spec of copy.images) {
    if (!/^[a-z0-9-]+$/.test(spec.id) || ids.has(spec.id) || !layouts.has(spec.layout))
      throw new Error(`Invalid composition: ${locale}/${spec.id}`)
    ids.add(spec.id)
    if (!spec.heading || typeof spec.heading !== 'string') throw new Error(`Heading missing: ${locale}/${spec.id}`)
    for (const input of spec.inputs ?? [spec.input]) {
      if (!validInput(input)) throw new Error(`Invalid input: ${input}`)
      required.add(path.join(inputDirectory, locale, input))
    }
    if (spec.detail) {
      if (!validInput(spec.detail.input)) throw new Error(`Invalid detail input: ${spec.detail.input}`)
      const { x, y, width, height } = spec.detail.crop
      if ([x, y, width, height].some(value => !Number.isInteger(value) || value < 0) || width === 0 || height === 0)
        throw new Error(`Invalid detail crop: ${locale}/${spec.id}`)
      required.add(path.join(inputDirectory, locale, spec.detail.input))
    }
    if (spec.panel && !(await exists(path.join(inputDirectory, locale, spec.panel)))) optionalPanels.add(`${locale}/${spec.panel}`)
  }
}
for (const spec of composition.promotionalImages) {
  const size = promoSizes.get(spec.layout)
  if (!size || spec.id !== spec.layout || spec.width !== size.width || spec.height !== size.height)
    throw new Error(`Invalid promotional size or layout: ${spec.id}`)
  if (!spec.heading || typeof spec.heading !== 'string' || !validInput(spec.input))
    throw new Error(`Invalid promotional copy or input: ${spec.id}`)
  const { x, y, width, height } = spec.screen
  if (
    [x, y, width, height].some(value => !Number.isFinite(value) || value < 0) ||
    width === 0 ||
    height === 0 ||
    x + width > spec.width ||
    y + height > spec.height
  )
    throw new Error(`Promotional screen leaves its canvas: ${spec.id}`)
  if (Math.abs(width * composition.captureSize.height - height * composition.captureSize.width) > 0.001)
    throw new Error(`Promotional screen must preserve the complete 16:9 capture: ${spec.id}`)
  required.add(path.join(inputDirectory, composition.defaultLocale, spec.input))
}
const missing = []
for (const filename of required) if (!(await exists(filename))) missing.push(relative(filename))
if (!(await exists(evidencePath))) missing.push(relative(evidencePath))
const invalidDimensions = []
for (const filename of required) {
  if (!(await exists(filename))) continue
  const { width, height } = imageDimensions(await fs.readFile(filename))
  if (width !== composition.captureSize.width || height !== composition.captureSize.height)
    invalidDimensions.push({ file: relative(filename), width, height })
}
if (!(await exists(iconPath))) throw new Error(`Product icon missing: ${iconPath}`)
if (args.includes('--check')) {
  console.log(
    JSON.stringify(
      {
        locales,
        screenshotSize: composition.screenshotSize,
        requiredInputs: required.size,
        missing,
        invalidDimensions,
        optionalPanelsMissing: [...optionalPanels],
      },
      null,
      2,
    ),
  )
  process.exitCode = missing.length || invalidDimensions.length ? 1 : 0
} else {
  if (missing.length) throw new Error(`Capture the real product inputs first:\n${missing.join('\n')}`)
  if (invalidDimensions.length)
    throw new Error(
      `Capture the complete video at the declared ${composition.captureSize.width} × ${composition.captureSize.height} dimensions: ${JSON.stringify(invalidDimensions)}`,
    )
  const browser = await chromium.launch({ headless: true })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.addInitScript(
      ({ composition, inputBase, iconUrl, optionalPanels }) => {
        window.__STORE_COMPOSITION__ = composition
        window.__STORE_INPUT_BASE__ = inputBase
        window.__STORE_ICON_URL__ = iconUrl
        window.__STORE_OPTIONAL_PANELS__ = optionalPanels
      },
      {
        composition,
        inputBase: pathToFileURL(`${inputDirectory}${path.sep}`).href,
        iconUrl: pathToFileURL(iconPath).href,
        optionalPanels: [...optionalPanels],
      },
    )
    await page.goto(pathToFileURL(path.join(sourceDirectory, 'gallery.html')).href)
    await page.waitForFunction(() => window.__ASSETS_READY__ === true, undefined, { timeout: 30000 })
    if (pageErrors.length) throw new Error(pageErrors.join('\n'))
    const overflow = await page
      .locator('.heading, .caption, .promo-name, .promo-heading, .promo-caption')
      .evaluateAll(elements =>
        elements
          .filter(element => element.scrollWidth > element.clientWidth)
          .map(element => ({ text: element.textContent, width: element.clientWidth, scrollWidth: element.scrollWidth })),
      )
    if (overflow.length) throw new Error(`Copy overflow: ${JSON.stringify(overflow)}`)
    const distortedCaptures = await page.locator('.screen .capture, .promo-screen .capture').evaluateAll(
      (images, captureSize) =>
        images
          .filter(image => {
            const rect = image.getBoundingClientRect()
            return (
              image.naturalWidth !== captureSize.width ||
              image.naturalHeight !== captureSize.height ||
              Math.abs(rect.width * 9 - rect.height * 16) > 0.01
            )
          })
          .map(image => ({
            image: image.alt,
            width: image.clientWidth,
            height: image.clientHeight,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          })),
      composition.captureSize,
    )
    if (distortedCaptures.length) throw new Error(`Capture proportions changed: ${JSON.stringify(distortedCaptures)}`)
    await fs.mkdir(exportDirectory, { recursive: true })
    const exports = []
    const targets = locales
      .flatMap(locale =>
        composition.locales[locale].images.map(spec => ({
          id: `${locale}-${spec.id}`,
          filename: `${locale}/${spec.id}.png`,
          width: 1280,
          height: 800,
        })),
      )
      .concat(
        composition.promotionalImages.map(spec => ({ id: spec.id, filename: `${spec.id}.png`, width: spec.width, height: spec.height })),
      )
    for (const target of targets) {
      const filename = path.join(exportDirectory, target.filename)
      await fs.mkdir(path.dirname(filename), { recursive: true })
      const png = await page.locator(`#${target.id}`).screenshot({ path: filename, animations: 'disabled' })
      const width = png.readUInt32BE(16)
      const height = png.readUInt32BE(20)
      if (width !== target.width || height !== target.height)
        throw new Error(`Export size mismatch: ${target.filename}, ${width} × ${height}`)
      exports.push({ file: relative(filename), width, height, sha256: sha256(png) })
    }
    const sourceFiles = [
      'composition.json',
      'gallery.html',
      'render.mjs',
      'fonts/inter-400.woff2',
      'fonts/inter-500.woff2',
      'fonts/LICENSE',
    ].map(filename => path.join(sourceDirectory, filename))
    const inputFiles = [...required]
    for (const locale of locales)
      for (const spec of composition.locales[locale].images)
        if (spec.panel && !optionalPanels.has(`${locale}/${spec.panel}`)) inputFiles.push(path.join(inputDirectory, locale, spec.panel))
    const sources = []
    for (const filename of [...sourceFiles, ...new Set(inputFiles), iconPath, evidencePath])
      sources.push({ file: relative(filename), sha256: sha256(await fs.readFile(filename)) })
    const manifest = {
      status: 'draft',
      storePublication: 'not-applied',
      generatedAt: new Date().toISOString(),
      renderer: {
        browser: browser.version(),
        platform: process.platform,
        arch: process.arch,
        deviceScaleFactor: 1,
        typography: 'Bundled Inter 400/500 under SIL Open Font License; native product UI fonts come from the production capture.',
      },
      sourceNote:
        'Complete production extension UI captures. Source provenance and verification are recorded in the referenced capture evidence.',
      captureEvidence: relative(evidencePath),
      sources,
      exports,
    }
    await fs.writeFile(path.join(exportDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(JSON.stringify({ exportDirectory, exports, optionalPanelsMissing: [...optionalPanels] }, null, 2))
  } finally {
    await browser.close()
  }
}
