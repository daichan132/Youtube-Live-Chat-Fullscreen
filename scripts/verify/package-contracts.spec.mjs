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
  const local = []
  const central = []
  let offset = 0
  for (const [name, contents] of entries) {
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
  end.writeUInt16LE(entries.size, 8)
  end.writeUInt16LE(entries.size, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, directory, end])
}

const createFixture = staleTarget => {
  const files = new Map()
  const put = (name, contents) => files.set(path.join(root, name), Buffer.from(contents))
  const packageJson = JSON.stringify({ version, packageManager: 'yarn@4.18.1' })
  put('package.json', packageJson)
  put(
    'config/package-size-budget.json',
    JSON.stringify({
      'chrome-mv3': { browser: 'chrome', budgets: { zipBytes: 380000, contentJsBytes: 450000 } },
      'firefox-mv2': { browser: 'firefox', budgets: { zipBytes: 380000, contentJsBytes: 450000 } },
    }),
  )
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
      web_accessible_resources:
        manifestVersion === 3 ? [{ resources: ['settings.html'], matches: ['https://www.youtube.com/*'] }] : ['settings.html'],
      content_security_policy: manifestVersion === 3 ? { extension_pages: csp } : csp,
    }
    if (manifestVersion === 2) {
      manifest.browser_specific_settings = { gecko: { data_collection_permissions: { required: ['none'] } } }
    }
    const entries = new Map([
      ['manifest.json', JSON.stringify(manifest)],
      ['settings.html', '<!doctype html>'],
      ['background.js', '// background'],
      ['content-scripts/content.js', 'const CURRENT_RUNTIME = true;'],
    ])
    for (let index = 0; index < 55; index += 1) {
      entries.set(`locales/lang${index}.json`, '{}')
      entries.set(`_locales/lang${index}/messages.json`, '{}')
    }
    for (const [name, contents] of entries) put(`.output/${target}/${name}`, contents)
    if (target === staleTarget) entries.set('content-scripts/content.js', 'const STALE___RUNTIME = true;')
    put(`.output/youtube-live-chat-fullscreen-${version}-${browser}.zip`, zipEntries(entries))
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
    '.yarn/releases/yarn-4.18.1.cjs',
    'config/packagePolicy.ts',
    'entrypoints/content/index.tsx',
    'public/_locales/en/messages.json',
    'scripts/generate-locales.mjs',
    'shared/settings/repository.ts',
  ]
  const sources = new Map(sourceFiles.map(name => [name, name === 'package.json' ? packageJson : '{}']))
  sources.set('SOURCE_CODE_REVIEW.md', 'yarn install --immutable\nyarn zip:firefox')
  put(`.output/youtube-live-chat-fullscreen-${version}-sources.zip`, zipEntries(sources))
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

const invokeChecker = async staleTarget => {
  vi.doMock('node:fs/promises', () => createFixture(staleTarget))
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

  it.each(['chrome-mv3', 'firefox-mv2'])('rejects a same-version %s ZIP with stale runtime bytes', async target => {
    const { report, exitCode } = await invokeChecker(target)
    expect(exitCode).toBe(1)
    expect(report.results.find(result => result.target === target).failures).toContain(
      'ZIP file differs from the generated extension directory: content-scripts/content.js',
    )
    expect(report.results.filter(result => result.target !== target).every(result => result.failures.length === 0)).toBe(true)
  })
})
