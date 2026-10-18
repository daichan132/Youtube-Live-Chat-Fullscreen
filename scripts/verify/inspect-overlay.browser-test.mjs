import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium } from '@playwright/test'

const exec = promisify(execFile)
const root = fileURLToPath(new URL('../..', import.meta.url))
const profile = await mkdtemp(path.join(os.tmpdir(), 'ylc-inspect-target-'))
let context
try {
  context = await chromium.launchPersistentContext(profile, { headless: true, args: ['--remote-debugging-port=0'] })
  await context.route('**/*', route =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Offline inspect fixture</title>' }),
  )
  const [port] = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n')
  const inspect = (...args) =>
    exec(process.execPath, ['scripts/verify/inspect-overlay.mjs', '--port', port, ...args], {
      cwd: root,
      timeout: 15000,
    })
  const first = context.pages()[0] ?? (await context.newPage())
  await first.goto('https://www.youtube.com/watch?v=inspect-first-fixture')

  const unique = await inspect()
  assert.equal(JSON.parse(unique.stdout).url, first.url(), 'A single URL match must remain usable without a target ID.')
  for (const invalid of [['--target-id='], ['--target-id'], ['--target-id', '--url-includes', 'youtube.com/watch']]) {
    await assert.rejects(inspect(...invalid), error => error.code === 1 && error.stderr.includes('--target-id requires a value'))
  }
  await assert.rejects(
    inspect('--port', '0', '--target-id'),
    error => error.code === 1 && error.stderr.includes('--target-id requires a value'),
  )
  assert.equal(context.pages().length, 1, 'Invalid explicit targets must not fall back to the single URL match.')

  const second = await context.newPage()
  await second.goto('https://www.youtube.com/watch?v=inspect-second-fixture')
  await first.bringToFront()
  assert.equal(await first.evaluate(() => document.hasFocus()), true)
  await assert.rejects(inspect(), error => error.code === 1 && error.stderr.includes('found 2'))

  const session = await context.newCDPSession(second)
  let targetId
  try {
    ;({
      targetInfo: { targetId },
    } = await session.send('Target.getTargetInfo'))
  } finally {
    await session.detach()
  }
  const exact = await inspect('--target-id', targetId)
  assert.equal(JSON.parse(exact.stdout).url, second.url(), 'The exact target must override the default URL selector.')
  assert.equal(await first.evaluate(() => document.hasFocus()), true, 'Inspection must not activate the selected tab.')
  await assert.rejects(inspect('--target-id', 'missing-owned-target'), error => error.code === 1 && error.stderr.includes('found 0'))
  assert.equal(context.pages().length, 2, 'Inspection must leave the caller-owned tabs open.')

  console.log('Overlay inspection CLI selects exact or unique targets and preserves existing tabs and focus')
} finally {
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
