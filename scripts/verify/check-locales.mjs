#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../..', import.meta.url))
const assetsDir = join(root, 'shared/i18n/assets')
const generatedDir = join(root, 'public/locales')
const manifestDir = join(root, 'public/_locales')
const rtlLocales = new Set(['ar', 'fa', 'he'])
const validLocale = /^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?$/u
const manifestKeys = [
  'popup_theme',
  'content_setting_theme',
  'content_setting_themeMode_system',
  'content_setting_themeMode_light',
  'content_setting_themeMode_dark',
]

const result = spawnSync(process.execPath, [join(root, 'scripts/generate-locales.mjs'), '--check'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, MISE_TRUSTED_CONFIG_PATHS: root },
})
if (result.status !== 0) process.exit(result.status ?? 1)

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, next, output)
    else if (typeof child === 'string' && child.trim()) output[next] = child
    else throw new Error(`Empty or invalid translation: ${next}`)
  }
  return output
}

const files = (await readdir(assetsDir)).filter(file => file.endsWith('.json')).sort()
const locales = files.map(file => file.slice(0, -5))
if (locales.some(locale => !validLocale.test(locale))) throw new Error('Invalid locale code in assets')
const english = flatten(JSON.parse(await readFile(join(assetsDir, 'en.json'), 'utf8')))
const englishKeys = Object.keys(english).sort()
const generatedEntries = await readdir(generatedDir, { withFileTypes: true })
if (generatedEntries.some(entry => !entry.isFile())) throw new Error('public/locales must contain flat JSON files only')

for (const locale of locales) {
  const rawAsset = JSON.parse(await readFile(join(assetsDir, `${locale}.json`), 'utf8'))
  const asset = flatten(rawAsset)
  if (JSON.stringify(Object.keys(asset).sort()) !== JSON.stringify(englishKeys)) throw new Error(`Asset key mismatch: ${locale}`)
  const generated = JSON.parse(await readFile(join(generatedDir, `${locale}.json`), 'utf8'))
  if (JSON.stringify(Object.keys(generated).sort()) !== JSON.stringify(englishKeys)) throw new Error(`Generated key mismatch: ${locale}`)

  const manifest = JSON.parse(await readFile(join(manifestDir, locale, 'messages.json'), 'utf8'))
  for (const key of manifestKeys) {
    const runtimeKey = key.replaceAll('_', '.').replace('content.setting.themeMode.', 'content.setting.themeMode.')
    const expected = asset[runtimeKey === 'popup.theme' ? 'popup.theme' : runtimeKey === 'content.setting.theme' ? 'content.setting.theme' : runtimeKey]
    if (manifest[key]?.message !== expected) throw new Error(`Manifest message mismatch: ${locale}/${key}`)
  }
  const direction = rtlLocales.has(locale.split('_')[0]) ? 'rtl' : 'ltr'
  if (!['ltr', 'rtl'].includes(direction)) throw new Error(`Invalid direction: ${locale}`)
}

console.log(`Locale contract valid: ${locales.length} locales, ${englishKeys.length} translation keys`)
