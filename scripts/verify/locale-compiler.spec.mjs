import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileLocales } from '../locales/compiler.mjs'

const compileFixture = async (translated, plain = 'Plain text') => {
  const root = await mkdtemp(join(tmpdir(), 'ylc-locale-compiler-'))
  const assetsDirectory = pathToFileURL(`${join(root, 'assets')}/`)
  const languageNamesFile = pathToFileURL(join(root, 'names.json'))
  const messages = (text, plainText) => ({
    extensionName: 'Extension',
    extensionDescription: 'Description',
    popup: { theme: 'Theme' },
    content: {
      setting: { theme: 'Theme', themeMode: { system: 'System', light: 'Light', dark: 'Dark' } },
      aria: { moved: text, plain: plainText },
    },
  })
  try {
    await mkdir(assetsDirectory)
    await Promise.all([
      writeFile(new URL('en.json', assetsDirectory), JSON.stringify(messages('Moved {display-name} to {position}', 'Plain text'))),
      writeFile(new URL('ja.json', assetsDirectory), JSON.stringify(messages(translated, plain))),
      writeFile(languageNamesFile, JSON.stringify({ en: 'English', ja: '日本語' })),
    ])
    return await compileLocales({ assetsDirectory, languageNamesFile })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('locale compiler placeholder contract', () => {
  it.each([
    'Position {position}, {display-name}',
    '{display-name}, {display-name} at {position}',
    'Moved {display-name}',
    'Moved without placeholders',
  ])('accepts reordered, repeated, or omitted placeholders: %s', async translated => {
    const compiled = await compileFixture(translated)
    const keys = JSON.parse(compiled.runtimeFiles.get('_keys.json'))
    const messages = JSON.parse(compiled.runtimeFiles.get('ja.json'))
    expect(messages[keys.indexOf('content.aria.moved')]).toBe(translated)
  })

  it('rejects an unknown placeholder with its locale and translation key', async () => {
    await expect(compileFixture('Moved {display-name} to {pos}')).rejects.toThrow(
      'Unknown placeholder {pos} in locale ja, key content.aria.moved',
    )
  })

  it('allows literal braces in translations of a key without English placeholders', async () => {
    const compiled = await compileFixture('Moved {display-name}', 'Literal {text}')
    const keys = JSON.parse(compiled.runtimeFiles.get('_keys.json'))
    const messages = JSON.parse(compiled.runtimeFiles.get('ja.json'))
    expect(messages[keys.indexOf('content.aria.plain')]).toBe('Literal {text}')
  })
})
