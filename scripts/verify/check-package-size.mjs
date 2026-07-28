#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../..', import.meta.url))
const outputRoot = join(root, '.output')
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const policy = JSON.parse(await readFile(join(root, 'config/package-size-budget.json'), 'utf8'))

const sumFiles = async (directory, predicate) => {
  let total = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) total += await sumFiles(path, predicate)
    else if (predicate(path, entry.name)) total += (await stat(path)).size
  }
  return total
}

const measureTarget = async (target, config) => {
  const directory = join(outputRoot, target)
  const zip = `youtube-live-chat-fullscreen-${packageJson.version}-${config.browser}.zip`
  const metrics = {
    zipBytes: await stat(join(outputRoot, zip)).then(file => file.size).catch(() => null),
    contentJsBytes: await sumFiles(directory, (_path, name) => name === 'content.js' && _path.includes('content-scripts')),
    popupJsBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.js')),
    contentCssBytes: await sumFiles(directory, (_path, name) => name === 'content.css' && _path.includes('content-scripts')),
    popupCssBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.css')),
    runtimeLocaleBytes: await sumFiles(join(directory, 'locales'), (_path, name) => name.endsWith('.json')),
    manifestLocaleBytes: await sumFiles(join(directory, '_locales'), (_path, name) => name.endsWith('.json')),
  }
  return { target, zip, baselines: config.baselines, budgets: config.budgets, metrics }
}

const reports = await Promise.all(Object.entries(policy).map(([target, config]) => measureTarget(target, config)))
const failures = []
for (const report of reports) {
  for (const [metric, budget] of Object.entries(report.budgets)) {
    const value = report.metrics[metric]
    if (value == null) failures.push(`${report.target}.${metric}: package zip is missing`)
    else if (value > budget) failures.push(`${report.target}.${metric}: ${value} > ${budget}`)
  }
}

console.log(JSON.stringify({ reports }, null, 2))
if (failures.length > 0) {
  console.error(`Package size budget failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Package size budgets passed')
}
