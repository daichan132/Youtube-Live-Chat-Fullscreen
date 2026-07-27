#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const outputRoot = join(root, '.output')
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))

// Baseline captured from the current production build on 2026-07-28. Budgets allow
// a small reviewable increase while keeping the extension's expensive surfaces bounded.
const BASELINES = {
  zipBytes: 310_020,
  contentJsBytes: 381_052,
  popupJsBytes: 240_063,
  contentCssBytes: 54_184,
  popupCssBytes: 45_178,
  localeBytes: 231_607,
}

const BUDGETS = {
  zipBytes: 500_000,
  contentJsBytes: 400_000,
  popupJsBytes: 260_000,
  contentCssBytes: 65_000,
  popupCssBytes: 55_000,
  localeBytes: 240_000,
}

const sumFiles = async (directory, predicate) => {
  let total = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) total += await sumFiles(path, predicate)
    else if (predicate(path, entry.name)) total += (await stat(path)).size
  }
  return total
}

const measureTarget = async target => {
  const directory = join(outputRoot, target)
  const browser = target === 'chrome-mv3' ? 'chrome' : 'firefox'
  const zip = `youtube-live-chat-fullscreen-${packageJson.version}-${browser}.zip`
  const metrics = {
    zipBytes: await stat(join(outputRoot, zip)).then(file => file.size).catch(() => null),
    contentJsBytes: await sumFiles(directory, (_path, name) => name === 'content.js' && _path.includes('content-scripts')),
    popupJsBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.js')),
    contentCssBytes: await sumFiles(directory, (_path, name) => name === 'content.css' && _path.includes('content-scripts')),
    popupCssBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.css')),
    localeBytes: await sumFiles(directory, (path, name) => name.endsWith('.json') && path.includes(join('locales', ''))),
  }
  return { target, zip, metrics }
}

const reports = await Promise.all(['chrome-mv3', 'firefox-mv2'].map(measureTarget))
const failures = []
for (const report of reports) {
  for (const [metric, budget] of Object.entries(BUDGETS)) {
    const value = report.metrics[metric]
    if (value == null) failures.push(`${report.target}.${metric}: package zip is missing`)
    else if (value > budget) failures.push(`${report.target}.${metric}: ${value} > ${budget}`)
  }
}

console.log(JSON.stringify({ baselines: BASELINES, budgets: BUDGETS, reports }, null, 2))
if (failures.length > 0) {
  console.error(`Package size budget failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Package size budgets passed')
}
