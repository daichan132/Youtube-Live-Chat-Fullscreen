import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isRTL } from './rtl'

const i18nDir = dirname(fileURLToPath(import.meta.url))
const assetsDir = join(i18nDir, 'assets')
const generatedDir = join(i18nDir, '..', '..', 'public', 'locales')
const typesPath = join(i18nDir, 'generated', 'translationTypes.ts')
const MANIFEST_ONLY_KEYS = new Set(['extensionName', 'extensionDescription'])

const flattenKeys = (value: Record<string, unknown>, prefix = '', output: string[] = []) => {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flattenKeys(child as Record<string, unknown>, next, output)
    else output.push(next)
  }
  return output.sort()
}

describe('generated i18n contract', () => {
  it('maps every generated message position to the authored translation for that key', () => {
    const sourceKeys = flattenKeys(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8'))).filter(key => !MANIFEST_ONLY_KEYS.has(key))
    const generatedKeys = JSON.parse(readFileSync(join(generatedDir, '_keys.json'), 'utf8')) as string[]
    expect(generatedKeys).toEqual(sourceKeys)
    for (const file of readdirSync(generatedDir)) {
      expect(statSync(join(generatedDir, file)).isFile(), file).toBe(true)
      if (file === '_keys.json') continue
      expect(file).toMatch(/^[a-z]{2,3}(?:_(?:[A-Z]{2}|\d{3}))?\.json$/u)
      const generated = JSON.parse(readFileSync(join(generatedDir, file), 'utf8')) as unknown[]
      const authored = JSON.parse(readFileSync(join(assetsDir, file), 'utf8')) as Record<string, unknown>
      // Look up authored messages by the public key contract, independently of the compiler's flattening implementation.
      const expected = sourceKeys.map(key =>
        key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], authored),
      )
      expect(generated, file).toEqual(expected)
    }
  })

  it('keeps generated LocaleCode and TranslationKey declarations aligned with source', () => {
    const locales = readdirSync(assetsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.slice(0, -'.json'.length))
      .sort()
    const sourceKeys = flattenKeys(JSON.parse(readFileSync(join(assetsDir, 'en.json'), 'utf8'))).filter(key => !MANIFEST_ONLY_KEYS.has(key))
    const directory = mkdtempSync(join(tmpdir(), 'ylc-translation-types-'))
    try {
      const checkFile = join(directory, 'check.mts')
      const union = (values: string[]) => values.map(value => JSON.stringify(value)).join(' | ')
      writeFileSync(
        checkFile,
        `
        import type { LocaleCode, TranslationKey } from ${JSON.stringify(typesPath)}
        type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
          ? ((<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2) ? true : false) : false
        const locales: Equal<LocaleCode, ${union(locales)}> = true
        const keys: Equal<TranslationKey, ${union(sourceKeys)}> = true
        void locales; void keys
      `,
      )
      try {
        execFileSync(
          process.execPath,
          [
            resolve('node_modules/typescript/bin/tsc'),
            '--noEmit',
            '--skipLibCheck',
            '--strict',
            '--module',
            'nodenext',
            '--moduleResolution',
            'nodenext',
            '--target',
            'esnext',
            '--allowImportingTsExtensions',
            checkFile,
          ],
          { cwd: directory, encoding: 'utf8' },
        )
      } catch (error) {
        const output = error as { stdout?: string; stderr?: string }
        throw new Error(`Generated translation types differ from authored assets:\n${output.stdout ?? ''}${output.stderr ?? ''}`, {
          cause: error,
        })
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps right-to-left direction classification explicit', () => {
    expect(isRTL('ar')).toBe(true)
    expect(isRTL('fa')).toBe(true)
    expect(isRTL('he')).toBe(true)
    expect(isRTL('en_US')).toBe(false)
    expect(isRTL('ja')).toBe(false)
  })
})
