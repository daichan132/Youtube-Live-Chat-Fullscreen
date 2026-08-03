#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const zipPath = path.join(root, '.output', `youtube-live-chat-fullscreen-${packageJson.version}-chrome.zip`)
const destination = path.join(root, '.output', 'production-smoke', 'chrome')

await access(zipPath).catch(() => {
  throw new Error(`Production Chrome ZIP is missing: ${zipPath}\nRun \`yarn zip\` first.`)
})
await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })
execFileSync('unzip', ['-q', zipPath, '-d', destination], { stdio: 'inherit' })

const manifest = JSON.parse(await readFile(path.join(destination, 'manifest.json'), 'utf8'))
if (manifest.version !== packageJson.version || manifest.manifest_version !== 3) {
  throw new Error(`Extracted manifest does not match Chrome v${packageJson.version}.`)
}
await access(path.join(destination, 'e2e.html')).then(
  () => {
    throw new Error('Production Chrome ZIP contains the testing bridge.')
  },
  () => {},
)

console.log(`Prepared exact production Chrome ZIP for browser smoke: ${path.relative(root, destination)}`)
