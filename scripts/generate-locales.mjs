import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const assetsDir = new URL('../shared/i18n/assets/', import.meta.url)
const publicDir = new URL('../public/locales/', import.meta.url)
const generatedDir = new URL('../shared/i18n/generated/', import.meta.url)
const checkOnly = process.argv.includes('--check')

const flatten = (value, prefix = '', output = {}) => {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, output)
    else if (typeof child === 'string' && child.trim()) output[path] = child
    else throw new Error(`Invalid locale value at ${path}`)
  }
  return output
}

const files = (await readdir(assetsDir)).filter(file => file.endsWith('.json')).sort()
const localeCodes = files.map(file => file.slice(0, -5))
if (localeCodes.some(locale => !/^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?$/u.test(locale))) {
  throw new Error(`Invalid locale code: ${localeCodes.find(locale => !/^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?$/u.test(locale))}`)
}
const english = flatten(JSON.parse(await readFile(new URL('en.json', assetsDir), 'utf8')))
const englishKeys = Object.keys(english).sort()

if (!checkOnly) await mkdir(publicDir, { recursive: true })
for (const file of files) {
  const locale = file.slice(0, -5)
  const messages = flatten(JSON.parse(await readFile(new URL(file, assetsDir), 'utf8')))
  const keys = Object.keys(messages).sort()
  if (keys.join('\0') !== englishKeys.join('\0')) throw new Error(`Locale keys differ: ${locale}`)
  const target = new URL(`${locale}.json`, publicDir)
  const expected = `${JSON.stringify(messages, null, 2)}\n`
  if (checkOnly) {
    if ((await readFile(target, 'utf8')) !== expected) throw new Error(`Generated locale is stale: ${locale}`)
  } else {
    await writeFile(target, expected)
  }
}

const quote = value => `'${value}'`
const union = values => `\n${values.map(value => `  | ${quote(value)}`).join('\n')}`
const generatedTypes = `export type LocaleCode =${union(localeCodes)}\n\nexport type TranslationKey =${union(englishKeys)}\n\nexport type LocaleMessages = Readonly<Record<TranslationKey, string>>\n\nexport type LocaleState = {\n  code: LocaleCode\n  direction: 'ltr' | 'rtl'\n  messages: LocaleMessages\n}\n`
if (checkOnly) {
  if ((await readFile(new URL('translationTypes.ts', generatedDir), 'utf8')) !== generatedTypes) throw new Error('Generated translation types are stale')
  const entries = await readdir(publicDir, { withFileTypes: true })
  const unexpected = entries.filter(entry => !entry.isFile() || !files.includes(entry.name)).map(entry => entry.name)
  if (unexpected.length > 0) throw new Error(`Unexpected public locale entries: ${unexpected.join(', ')}`)
} else {
  await mkdir(generatedDir, { recursive: true })
  await writeFile(new URL('translationTypes.ts', generatedDir), generatedTypes)
}
console.log(`${checkOnly ? 'Checked' : 'Generated'} ${localeCodes.length} locale assets`)
