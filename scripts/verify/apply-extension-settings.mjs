#!/usr/bin/env node
import path from 'node:path'
import { chromium } from '@playwright/test'
import { applyExtensionSettings, readSettingsPatch } from './extension-settings.mjs'
import { findLoadedExtension, verifyCdpProfile } from './verification-target.mjs'

const args = new Map()
for (let index = 2; index < process.argv.length; index++) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) throw new Error(`Expected an option: ${arg}`)
  const equal = arg.indexOf('=')
  const key = arg.slice(2, equal < 0 ? undefined : equal)
  const value = equal < 0 ? process.argv[++index] : arg.slice(equal + 1)
  if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`)
  args.set(key, value)
}
const allowed = new Set(['port', 'profile', 'extension', 'settings-file', 'target-id', 'url-includes'])
for (const key of args.keys()) if (!allowed.has(key)) throw new Error(`Unknown option: --${key}`)
const port = Number(args.get('port') ?? 9336)
const patch = await readSettingsPatch(args.get('settings-file'))
await verifyCdpProfile({ port, profileDir: args.get('profile') })
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
try {
  const matches = []
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      const url = new URL(page.url())
      if (url.hostname !== 'www.youtube.com' || !(url.pathname === '/watch' || url.pathname.startsWith('/live/'))) continue
      if (args.has('target-id')) {
        const session = await context.newCDPSession(page)
        try {
          const { targetInfo } = await session.send('Target.getTargetInfo')
          if (targetInfo.targetId === args.get('target-id')) matches.push(page)
        } finally {
          await session.detach()
        }
      } else if (page.url().includes(args.get('url-includes') ?? 'youtube.com/watch')) matches.push(page)
    }
  }
  if (matches.length !== 1) throw new Error(`Expected one target YouTube page; found ${matches.length}. Pass --target-id.`)
  const extension = await findLoadedExtension(browser, path.resolve(args.get('extension') ?? '.output/chrome-mv3'))
  const result = await applyExtensionSettings({ page: matches[0], extensionId: extension.id, patch })
  console.log(JSON.stringify({ extensionId: extension.id, extensionVersion: extension.version, settings: result }, null, 2))
} finally {
  await browser.close()
}
