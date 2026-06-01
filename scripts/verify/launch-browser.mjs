#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const DEFAULT_URL = 'https://www.youtube.com/watch?v=EWrX250Zhko'
const DEFAULT_PORT = 9335

const args = new Map()
const positionals = []
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) {
    positionals.push(arg)
    continue
  }

  const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
  const value = inlineValue ?? process.argv[index + 1]
  args.set(rawKey, value)
  if (inlineValue === undefined) index += 1
}

const rootDir = process.cwd()
const extensionPath = path.resolve(rootDir, args.get('extension') ?? '.output/chrome-mv3')
const manifestPath = path.join(extensionPath, 'manifest.json')
const port = Number(args.get('port') ?? process.env.YLC_VERIFY_PORT ?? DEFAULT_PORT)
const url = positionals[0] ?? args.get('url') ?? process.env.YLC_VERIFY_URL ?? DEFAULT_URL
const profileDir = args.get('profile') ?? process.env.YLC_VERIFY_PROFILE ?? path.join('/private/tmp', `ylc-verify-profile-${port}`)
const ownsProfileDir = !args.has('profile') && !process.env.YLC_VERIFY_PROFILE
const cdpUrl = `http://127.0.0.1:${port}`

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing extension manifest: ${manifestPath}`)
  console.error('Run `yarn build` first. Verification must use .output/chrome-mv3, not .output/chrome-mv3-dev.')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
if (!Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0) {
  console.error(`Extension manifest has no content_scripts: ${manifestPath}`)
  console.error('Use the built extension output, usually `.output/chrome-mv3`.')
  process.exit(1)
}

const muteVideos = async page => {
  await page
    .evaluate(() => {
      for (const video of document.querySelectorAll('video')) {
        video.volume = 0
        video.muted = true
      }
    })
    .catch(() => null)
}

const connectToExistingBrowser = async () => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 500)

  try {
    const response = await fetch(`${cdpUrl}/json/version`, { signal: controller.signal })
    if (!response.ok) return null

    return await chromium.connectOverCDP(cdpUrl)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

const existingBrowser = await connectToExistingBrowser()
if (existingBrowser) {
  try {
    const context = existingBrowser.contexts()[0]
    const page = context?.pages()[0] ?? (context ? await context.newPage() : null)
    if (!page) {
      console.error(`Existing browser on ${cdpUrl} has no usable context.`)
      process.exit(1)
    }

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await muteVideos(page)

    console.log(
      JSON.stringify(
        {
          status: 'reused',
          app: 'Google Chrome for Testing',
          url,
          extensionPath,
          profileDir,
          cdp: cdpUrl,
          inspect: `yarn verify:overlay --port ${port}`,
        },
        null,
        2,
      ),
    )
    console.log('Reused the existing verification browser. No new Chrome for Testing process was launched.')
  } finally {
    await existingBrowser.close().catch(() => null)
  }
  process.exit(0)
}

const context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: null,
  ignoreDefaultArgs: ['--disable-extensions'],
  args: [
    `--remote-debugging-port=${port}`,
    '--window-size=1280,900',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
})

await context.addInitScript(() => {
  const mute = () => {
    for (const video of document.querySelectorAll('video')) {
      video.volume = 0
      video.muted = true
    }
  }
  document.addEventListener('play', mute, true)
  document.addEventListener('volumechange', mute, true)
  setInterval(mute, 1000)
})

const page = context.pages()[0] ?? (await context.newPage())
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
await muteVideos(page)

console.log(
  JSON.stringify(
    {
      status: 'ready',
      app: 'Google Chrome for Testing',
      url,
      extensionPath,
      profileDir,
      cdp: cdpUrl,
      inspect: `yarn verify:overlay --port ${port}`,
    },
    null,
    2,
  ),
)
console.log('Keep this process running while using Computer Use. Press Ctrl+C to close the verification browser.')

const keepAlive = setInterval(() => {}, 1 << 30)

const shutdown = async () => {
  clearInterval(keepAlive)
  await context.close().catch(() => null)
  if (ownsProfileDir) fs.rmSync(profileDir, { recursive: true, force: true })
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
