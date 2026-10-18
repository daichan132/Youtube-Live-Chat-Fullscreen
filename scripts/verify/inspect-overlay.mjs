#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import { chromium } from '@playwright/test'
import { resolveCapturePage } from './capture-support.mjs'
import { readOverlayState } from './overlay-state-reader.mjs'

const DEFAULT_PORT = 9335

const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) continue

  const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
  const value = inlineValue ?? process.argv[index + 1]
  if (rawKey === 'target-id' && (!value || value.startsWith('--'))) {
    throw new Error('--target-id requires a value')
  }
  args.set(rawKey, value)
  if (inlineValue === undefined) index += 1
}

const port = Number(args.get('port') ?? process.env.YLC_VERIFY_PORT ?? DEFAULT_PORT)
const targetUrlPart = args.get('url-includes') ?? 'youtube.com/watch'
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)

try {
  const { page } = await resolveCapturePage(browser, {
    targetId: args.get('target-id'),
    urlIncludes: targetUrlPart,
  })

  const state = await page.evaluate(readOverlayState, { includeDiagnostics: true })

  console.log(JSON.stringify(state, null, 2))
  if (state.extensionDomExpected && !state.extensionDomMounted) {
    console.error('')
    console.error('The page is fullscreen, but no YLC extension DOM was found.')
    console.error('Make sure the unpacked extension is loaded in this Chrome profile, then reload the YouTube page.')
    process.exitCode = 2
  }
} finally {
  await browser.close().catch(() => null)
}
