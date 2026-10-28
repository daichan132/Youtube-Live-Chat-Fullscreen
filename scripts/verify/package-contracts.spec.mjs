import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32 } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))
const originalExitCode = process.exitCode
const version = '2.3.16'

// Stored ZIP entries keep the fixture independent of WXT and exercise the
// checker's actual central-directory reader, including the bytes it returns.
const zipEntries = entries => {
  const records = [...entries]
  const local = []
  const central = []
  let offset = 0
  for (const [name, contents] of records) {
    const filename = Buffer.from(name)
    const bytes = Buffer.from(contents)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt32LE(crc32(bytes), 14)
    header.writeUInt32LE(bytes.length, 18)
    header.writeUInt32LE(bytes.length, 22)
    header.writeUInt16LE(filename.length, 26)
    local.push(header, filename, bytes)
    const record = Buffer.alloc(46)
    record.writeUInt32LE(0x02014b50, 0)
    record.writeUInt16LE(20, 4)
    record.writeUInt16LE(20, 6)
    record.writeUInt32LE(crc32(bytes), 16)
    record.writeUInt32LE(bytes.length, 20)
    record.writeUInt32LE(bytes.length, 24)
    record.writeUInt16LE(filename.length, 28)
    record.writeUInt32LE(offset, 42)
    central.push(record, filename)
    offset += header.length + filename.length + bytes.length
  }
  const directory = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(records.length, 8)
  end.writeUInt16LE(records.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}

const createFixture = (
  staleTarget,
  {
    large = false,
    missingTarget,
    addLocale = false,
    replaceLocale = false,
    keys = 'valid',
    localeData,
    packageManager = 'yarn@4.18.1',
    checkoutYarnrc,
    sourceYarnrc,
    omitYarn = false,
    omitYarnHelper = false,
    omitLocaleCompiler = false,
    omitSourceFile,
    contentScriptsTarget,
    contentScriptsJs,
    missingFileTarget,
    missingFile,
    popupTarget,
    popupPath,
    duplicateTarget,
    emptyStyleTarget,
    emptyScriptTarget,
    emptyScriptFile,
    emptyPageTarget,
    emptyPageFile,
    corruptCrcTarget,
  } = {},
) => {
  const files = new Map()
  const put = (name, contents) => files.set(path.join(root, name), Buffer.from(contents))
  const packageJson = JSON.stringify({ version, packageManager })
  const release = `.yarn/releases/yarn-${packageManager.slice('yarn@'.length)}.cjs`
  const yarnrc = `yarnPath: ${release}\n`
  put('package.json', packageJson)
  put('.yarnrc.yml', checkoutYarnrc ?? yarnrc)
  const authoredLocales = Array.from({ length: 55 }, (_, index) => `lang${index}`)
  if (addLocale) authoredLocales.push('newlang')
  put('shared/i18n/language_codes.json', JSON.stringify(Object.fromEntries(authoredLocales.map(locale => [locale, locale]))))
  put('public/locales/_keys.json', '["popup.theme"]')
  for (const locale of authoredLocales) {
    put(`public/locales/${locale}.json`, '["Theme"]')
    put(`public/_locales/${locale}/messages.json`, '{}')
  }
  const packagedLocales = replaceLocale ? [...authoredLocales.slice(1), 'unexpected'] : authoredLocales
  for (const [target, browser, manifestVersion] of [
    ['chrome-mv3', 'chrome', 3],
    ['firefox-mv2', 'firefox', 2],
  ]) {
    const csp = "script-src 'self'; object-src 'none'; frame-ancestors 'self' https://www.youtube.com"
    const manifest = {
      version,
      manifest_version: manifestVersion,
      default_locale: 'en',
      permissions: ['storage'],
      content_scripts: [{ matches: ['https://www.youtube.com/*'], js: ['content-scripts/content.js'] }],
      background: manifestVersion === 3 ? { service_worker: 'background.js' } : { scripts: ['background.js'] },
      ...(manifestVersion === 3 ? { action: { default_popup: 'popup.html' } } : { browser_action: { default_popup: 'popup.html' } }),
      web_accessible_resources:
        manifestVersion === 3 ? [{ resources: ['settings.html'], matches: ['https://www.youtube.com/*'] }] : ['settings.html'],
      content_security_policy: manifestVersion === 3 ? { extension_pages: csp } : csp,
    }
    if (target === contentScriptsTarget) manifest.content_scripts[0].js = contentScriptsJs
    if (target === popupTarget) (manifest.action ?? manifest.browser_action).default_popup = popupPath
    if (manifestVersion === 2) {
      manifest.browser_specific_settings = { gecko: { data_collection_permissions: { required: ['none'] } } }
    }
    const entries = new Map([
      ['manifest.json', JSON.stringify(manifest)],
      ['settings.html', '<!doctype html>'],
      ['popup.html', '<!doctype html>'],
      ['background.js', '// background'],
      ['content-scripts/content.js', `const CURRENT_RUNTIME = true;${large ? ' '.repeat(451_001) : ''}`],
      ['content-scripts/content.css', '.overlay{}'],
    ])
    if (target === emptyStyleTarget) entries.set('content-scripts/content.css', ' \n\t')
    if (target === emptyScriptTarget) entries.set(emptyScriptFile, ' \n\t')
    if (target === emptyPageTarget) entries.set(emptyPageFile, ' \n\t')
    if (target === missingFileTarget) entries.delete(missingFile)
    for (const locale of packagedLocales) {
      entries.set(`locales/${locale}.json`, locale === 'lang0' && localeData?.runtime !== undefined ? localeData.runtime : '["Theme"]')
      entries.set(`_locales/${locale}/messages.json`, locale === 'lang0' && localeData?.manifest !== undefined ? localeData.manifest : '{}')
    }
    if (keys !== 'missing') entries.set('locales/_keys.json', keys === 'valid' ? '["popup.theme"]' : keys)
    for (const [name, contents] of entries) put(`.output/${target}/${name}`, contents)
    if (target === staleTarget) entries.set('content-scripts/content.js', 'const STALE___RUNTIME = true;')
    const zipContents =
      target === duplicateTarget ? [...entries, ['content-scripts/content.js', entries.get('content-scripts/content.js')]] : entries
    const archive = zipEntries(zipContents)
    if (target === corruptCrcTarget) {
      archive.writeUInt32LE(0, 14)
      archive.writeUInt32LE(0, archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 16)
    }
    if (target !== missingTarget) put(`.output/youtube-live-chat-fullscreen-${version}-${browser}.zip`, archive)
  }
  const sourceFiles = [
    '.yarnrc.yml',
    'LICENSE',
    'README.md',
    'SOURCE_CODE_REVIEW.md',
    'mise.toml',
    'package.json',
    'tsconfig.json',
    'wxt.config.ts',
    'yarn.lock',
    release,
    'config/packagePolicy.ts',
    'config/yarnRelease.ts',
    'entrypoints/content/index.tsx',
    'public/_locales/en/messages.json',
    'scripts/generate-locales.mjs',
    'scripts/locales/compiler.mjs',
    'shared/i18n/language_codes.json',
    'shared/i18n/generated/localeMetadata.ts',
    'shared/i18n/generated/translationTypes.ts',
    'public/locales/_keys.json',
    ...authoredLocales.flatMap(locale => [
      `shared/i18n/assets/${locale}.json`,
      `public/locales/${locale}.json`,
      `public/_locales/${locale}/messages.json`,
    ]),
    'shared/settings/repository.ts',
  ]
  const sources = new Map(sourceFiles.map(name => [name, name === 'package.json' ? packageJson : '{}']))
  sources.set('.yarnrc.yml', sourceYarnrc ?? yarnrc)
  if (omitYarn) sources.delete(release)
  if (omitYarnHelper) sources.delete('config/yarnRelease.ts')
  if (omitLocaleCompiler) sources.delete('scripts/locales/compiler.mjs')
  if (omitSourceFile) sources.delete(omitSourceFile)
  if (large) sources.set('README.md', 'x'.repeat(5_000_001))
  sources.set('SOURCE_CODE_REVIEW.md', 'yarn install --immutable\nyarn zip:firefox')
  const sourceContents = duplicateTarget === 'sources' ? [...sources, ['package.json', sources.get('package.json')]] : sources
  const sourceArchive = zipEntries(sourceContents)
  if (corruptCrcTarget === 'sources') {
    sourceArchive.writeUInt32LE(0, 14)
    sourceArchive.writeUInt32LE(0, sourceArchive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 16)
  }
  if (missingTarget !== 'sources') put(`.output/youtube-live-chat-fullscreen-${version}-sources.zip`, sourceArchive)
  return {
    readdir: async directory => {
      const children = new Map()
      for (const name of files.keys()) {
        if (!name.startsWith(`${directory}${path.sep}`)) continue
        const remaining = name.slice(directory.length + 1)
        const child = remaining.split(path.sep)[0]
        children.set(child, (children.get(child) ?? false) || remaining.includes(path.sep))
      }
      return [...children].map(([name, directory]) => ({ name, isDirectory: () => directory }))
    },
    readFile: async (name, encoding) => {
      const bytes = files.get(name)
      if (!bytes) throw new Error(`Missing fixture file: ${name}`)
      return encoding ? bytes.toString(encoding) : bytes
    },
    stat: async name => {
      const bytes = files.get(name)
      if (!bytes) throw new Error(`Missing fixture file: ${name}`)
      return { size: bytes.length }
    },
  }
}

const invokeChecker = async (staleTarget, options) => {
  vi.doMock('node:fs/promises', () => createFixture(staleTarget, options))
  const stdout = []
  vi.spyOn(console, 'log').mockImplementation(value => stdout.push(value))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.exitCode = undefined
  await import('./check-package-contracts.mjs')
  return { report: JSON.parse(stdout[0]), exitCode: process.exitCode ?? 0 }
}

afterEach(() => {
  process.exitCode = originalExitCode
  vi.doUnmock('node:fs/promises')
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('production package checker', () => {
  it('accepts matching production directories and ZIP bytes', async () => {
    const { report, exitCode } = await invokeChecker()
    expect(exitCode).toBe(0)
    expect(report.results.every(result => result.failures.length === 0)).toBe(true)
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects a missing or invalid content script registration in %s', async target => {
    for (const contentScriptsJs of [undefined, [], 'content-scripts/content.js', ['background.js']]) {
      vi.resetModules()
      vi.restoreAllMocks()
      const { report, exitCode } = await invokeChecker(undefined, { contentScriptsTarget: target, contentScriptsJs })
      expect(exitCode).toBe(1)
      expect(report.results.find(result => result.target === target).failures).toContain(
        'content script must register content-scripts/content.js',
      )
      expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
    }
  })

  it.each(['chrome-mv3', 'firefox-mv2', 'sources'])('rejects a duplicate path in the %s ZIP', async target => {
    const file = target === 'sources' ? 'package.json' : 'content-scripts/content.js'
    await expect(invokeChecker(undefined, { duplicateTarget: target })).rejects.toThrow(`Duplicate ZIP entry: ${file}`)
  })

  it.each(['chrome-mv3', 'firefox-mv2', 'sources'])('rejects a corrupt CRC in the %s ZIP', async target => {
    const file = target === 'sources' ? '.yarnrc.yml' : 'manifest.json'
    await expect(invokeChecker(undefined, { corruptCrcTarget: target })).rejects.toThrow(`ZIP CRC mismatch: ${file}`)
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects missing popup and content stylesheet in %s', async target => {
    for (const file of ['popup.html', 'content-scripts/content.css']) {
      vi.resetModules()
      vi.restoreAllMocks()
      const { report, exitCode } = await invokeChecker(undefined, { missingFileTarget: target, missingFile: file })
      expect(exitCode).toBe(1)
      expect(report.results.find(result => result.target === target).failures).toContain(`required extension file is missing: ${file}`)
    }
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects an empty content stylesheet in %s', async target => {
    const { report, exitCode } = await invokeChecker(undefined, { emptyStyleTarget: target })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === target).failures).toContain('content stylesheet must not be empty')
    expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects empty required scripts in %s', async target => {
    for (const file of ['background.js', 'content-scripts/content.js']) {
      vi.resetModules()
      vi.restoreAllMocks()
      const { report, exitCode } = await invokeChecker(undefined, { emptyScriptTarget: target, emptyScriptFile: file })
      expect(exitCode).toBe(1)
      expect(report.results.find(result => result.target === target).failures).toContain(
        `required extension file must not be empty: ${file}`,
      )
      expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
    }
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects empty extension pages in %s', async target => {
    for (const file of ['popup.html', 'settings.html']) {
      vi.resetModules()
      vi.restoreAllMocks()
      const { report, exitCode } = await invokeChecker(undefined, { emptyPageTarget: target, emptyPageFile: file })
      expect(exitCode).toBe(1)
      expect(report.results.find(result => result.target === target).failures).toContain(
        `required extension file must not be empty: ${file}`,
      )
      expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
    }
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects an unregistered popup in %s', async target => {
    const { report, exitCode } = await invokeChecker(undefined, { popupTarget: target, popupPath: 'missing.html' })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === target).failures).toContain('extension action must register popup.html')
  })

  it('accepts a different consistently pinned Yarn version', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { packageManager: 'yarn@4.19.0' })
    expect(exitCode).toBe(0)
    expect(report.results.every(result => result.failures.length === 0)).toBe(true)
  })

  it('rejects a source ZIP whose Yarn path disagrees with packageManager', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { sourceYarnrc: 'yarnPath: .yarn/releases/yarn-4.19.0.cjs\n' })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(
      'source Yarn configuration is invalid: .yarnrc.yml yarnPath must be .yarn/releases/yarn-4.18.1.cjs',
    )
  })

  it('rejects a source ZIP missing its pinned Yarn release', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { omitYarn: true })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(
      'required rebuild input is missing: .yarn/releases/yarn-4.18.1.cjs',
    )
  })

  it('rejects a source ZIP missing the Yarn configuration helper required by WXT', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { omitYarnHelper: true })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(
      'required rebuild input is missing: config/yarnRelease.ts',
    )
  })

  it('rejects a source ZIP missing the locale compiler required by its generation command', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { omitLocaleCompiler: true })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(
      'required rebuild input is missing: scripts/locales/compiler.mjs',
    )
  })

  it.each([
    'shared/i18n/language_codes.json',
    'shared/i18n/generated/localeMetadata.ts',
    'shared/i18n/generated/translationTypes.ts',
    'shared/i18n/assets/lang0.json',
    'public/locales/_keys.json',
    'public/locales/lang0.json',
    'public/_locales/lang0/messages.json',
  ])('rejects a source ZIP missing locale generator input or output %s', async file => {
    const { report, exitCode } = await invokeChecker(undefined, { omitSourceFile: file })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(`required rebuild input is missing: ${file}`)
  })

  it('requires source assets for a newly added language', async () => {
    const file = 'shared/i18n/assets/newlang.json'
    const { report, exitCode } = await invokeChecker(undefined, { addLocale: true, omitSourceFile: file })
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === 'sources').failures).toContain(`required rebuild input is missing: ${file}`)
  })

  it('rejects an inconsistent checkout Yarn configuration', async () => {
    await expect(invokeChecker(undefined, { checkoutYarnrc: 'yarnPath: .yarn/releases/yarn-4.19.0.cjs\n' })).rejects.toThrow(
      '.yarnrc.yml yarnPath must be .yarn/releases/yarn-4.18.1.cjs',
    )
  })

  it('accepts a language added to both the authored list and packaged inventories', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { addLocale: true })
    expect(exitCode).toBe(0)
    expect(report.results.filter(result => result.target !== 'sources').map(result => result.localeCount)).toEqual([56, 56])
  })

  it('rejects a missing and an unexpected language even when both inventories have the correct count', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { replaceLocale: true })
    expect(exitCode).toBe(1)
    for (const result of report.results.filter(entry => entry.target !== 'sources')) {
      expect(result.localeCount).toBe(55)
      expect(result.failures).toContain('runtime locale inventory differs from language_codes.json')
      expect(result.failures).toContain('manifest locale inventory differs from language_codes.json')
    }
  })

  it.each([
    { keys: 'missing', failure: 'locales/_keys.json is missing' },
    { keys: '{}', failure: 'locales/_keys.json must be an array of strings' },
    { keys: '["popup.theme", 1]', failure: 'locales/_keys.json must be an array of strings' },
    { keys: 'invalid', failure: 'locales/_keys.json is not valid JSON:' },
  ])('rejects missing or invalid locale keys: $keys', async ({ keys, failure }) => {
    const { report, exitCode } = await invokeChecker(undefined, { keys })
    expect(exitCode).toBe(1)
    for (const result of report.results.filter(entry => entry.target !== 'sources')) {
      expect(result.failures.some(message => message.startsWith(failure))).toBe(true)
    }
  })

  it.each([
    { options: { keys: '["other.key"]' }, file: 'locales/_keys.json' },
    { options: { localeData: { runtime: '["Wrong translation"]' } }, file: 'locales/lang0.json' },
    { options: { localeData: { manifest: '{"name":"wrong"}' } }, file: '_locales/lang0/messages.json' },
  ])('rejects $file when ZIP and unpacked content both differ from public', async ({ options, file }) => {
    const { report, exitCode } = await invokeChecker(undefined, options)
    expect(exitCode).toBe(1)
    for (const result of report.results.filter(entry => entry.target !== 'sources')) {
      expect(result.failures).toContain(`${file} differs from generated public asset`)
      expect(result.failures.some(message => message.includes('ZIP file differs'))).toBe(false)
    }
  })

  it.each([
    { runtime: '{}', failure: 'locales/lang0.json must be an array of strings' },
    { runtime: '[1]', failure: 'locales/lang0.json must be an array of strings' },
    { runtime: '["Theme", "extra"]', failure: 'locales/lang0.json length does not match locales/_keys.json' },
  ])('rejects an invalid runtime locale array: $runtime', async ({ runtime, failure }) => {
    const { report, exitCode } = await invokeChecker(undefined, { localeData: { runtime } })
    expect(exitCode).toBe(1)
    for (const result of report.results.filter(entry => entry.target !== 'sources')) expect(result.failures).toContain(failure)
  })

  it('reports large package sizes without rejecting otherwise valid packages', async () => {
    const { report, exitCode } = await invokeChecker(undefined, { large: true })
    expect(exitCode).toBe(0)
    for (const target of ['chrome-mv3', 'firefox-mv2']) {
      const result = report.results.find(entry => entry.target === target)
      expect(result.metrics.zipBytes).toBeGreaterThan(381_000)
      expect(result.metrics.contentJsBytes).toBeGreaterThan(451_000)
      expect(result.failures).toEqual([])
    }
    const source = report.results.find(entry => entry.target === 'sources')
    expect(source.metrics.zipBytes).toBeGreaterThan(5_000_000)
    expect(source.failures).toEqual([])
  })

  it.each(['chrome-mv3', 'firefox-mv2', 'sources'])('rejects a missing %s ZIP', async target => {
    const { report, exitCode } = await invokeChecker(undefined, { missingTarget: target })
    expect(exitCode).toBe(1)
    const missing = report.results.find(result => result.target === target)
    expect(missing.metrics.zipBytes).toBeNull()
    expect(missing.failures).toContain(target === 'sources' ? 'sources ZIP is missing' : 'package ZIP is missing')
    expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
  })

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects a same-version %s ZIP with stale runtime bytes', async target => {
    const { report, exitCode } = await invokeChecker(target)
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === target).failures).toContain(
      'ZIP file differs from the generated extension directory: content-scripts/content.js',
    )
    expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
  })
})
