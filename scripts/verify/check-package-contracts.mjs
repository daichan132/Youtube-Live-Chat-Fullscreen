#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const root = fileURLToPath(new URL('../..', import.meta.url))
const outputRoot = join(root, '.output')
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const sizePolicy = JSON.parse(await readFile(join(root, 'config/package-size-budget.json'), 'utf8'))
const expectedPermissions = ['storage']
const expectedContentScriptMatches = ['*://www.youtube.com/*']
const forbiddenProductionFiles = [
  { label: 'E2E bridge', matches: file => file === 'e2e.html' },
  { label: 'source map', matches: file => file.endsWith('.map') },
  { label: 'test file', matches: file => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file) },
  { label: 'fixture asset', matches: file => /(^|\/)fixtures?(\/|$)/i.test(file) },
  { label: 'test bridge asset', matches: file => /(^|\/)test-bridge(?:\/|$)/i.test(file) },
]
const sourcePackagePolicy = {
  budgetBytes: 5_000_000,
  rootFiles: [
    '.yarnrc.yml',
    'LICENSE',
    'README.md',
    'SOURCE_CODE_REVIEW.md',
    'mise.toml',
    'package.json',
    'tsconfig.json',
    'wxt.config.ts',
    'yarn.lock',
  ],
  allowedPrefixes: ['.yarn/releases/', 'config/', 'entrypoints/', 'public/', 'scripts/', 'shared/'],
  requiredFiles: [
    '.yarn/releases/yarn-4.18.0.cjs',
    'config/packagePolicy.ts',
    'entrypoints/content/index.tsx',
    'public/_locales/en/messages.json',
    'scripts/generate-locales.mjs',
    'shared/settings/repository.ts',
  ],
  forbiddenPrefixes: ['.github/', '.output/', 'articles/', 'docs/', 'e2e/', 'node_modules/', 'playwright-report/', 'test-results/', 'tests/'],
}

const toPosixPath = path => path.split(sep).join('/')

const collectFiles = async directory => {
  const files = []
  const visit = async current => {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      else files.push(toPosixPath(relative(directory, path)))
    }
  }
  await visit(directory)
  return files.sort()
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

const findEndOfCentralDirectory = buffer => {
  const minimumOffset = Math.max(0, buffer.length - 65_557)
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset
  }
  throw new Error('ZIP end-of-central-directory record was not found')
}

const readZipEntries = async zipPath => {
  const buffer = await readFile(zipPath)
  const endOffset = findEndOfCentralDirectory(buffer)
  const entryCount = buffer.readUInt16LE(endOffset + 10)
  let offset = buffer.readUInt32LE(endOffset + 16)
  const entries = new Map()

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error(`Invalid ZIP central-directory entry at offset ${offset}`)
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const fileNameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)
    const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf8')

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) throw new Error(`Invalid ZIP local entry for ${fileName}`)
    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize)
    const contents = fileName.endsWith('/')
      ? Buffer.alloc(0)
      : compressionMethod === 0
        ? compressed
        : compressionMethod === 8
          ? inflateRawSync(compressed)
          : null
    if (contents === null) throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${fileName}`)
    entries.set(fileName, contents)
    offset += 46 + fileNameLength + extraLength + commentLength
  }

  return entries
}

const localeCodes = (files, pattern) =>
  files
    .map(file => file.match(pattern)?.[1])
    .filter(Boolean)
    .sort()

const findForbiddenFiles = files =>
  forbiddenProductionFiles.flatMap(rule => files.filter(rule.matches).map(file => `${rule.label}: ${file}`))

const hasRuntimeResources = manifest => {
  const resources = manifest.web_accessible_resources ?? []
  const expectedResources = ['locales/*.json', 'settings.html']
  if (manifest.manifest_version === 2) {
    return expectedResources.every(resource => resources.includes(resource))
  }

  const runtimeResources = resources.filter(resource =>
    typeof resource === 'object' ? resource.resources?.includes('locales/*.json') : false,
  )
  if (runtimeResources.length !== 1) return false
  const [resource] = runtimeResources
  return (
    JSON.stringify(resource.resources) === JSON.stringify(expectedResources) &&
    JSON.stringify(resource.matches) === JSON.stringify(['https://www.youtube.com/*'])
  )
}

const measureTarget = async (target, config) => {
  const directory = join(outputRoot, target)
  const zipName = `youtube-live-chat-fullscreen-${packageJson.version}-${config.browser}.zip`
  const zipPath = join(outputRoot, zipName)
  const metrics = {
    zipBytes: await stat(zipPath)
      .then(file => file.size)
      .catch(() => null),
    contentJsBytes: await sumFiles(directory, (path, name) => name === 'content.js' && path.includes('content-scripts')),
    popupJsBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.js')),
    contentCssBytes: await sumFiles(directory, (path, name) => name === 'content.css' && path.includes('content-scripts')),
    popupCssBytes: await sumFiles(directory, (_path, name) => name.startsWith('popup-') && name.endsWith('.css')),
    runtimeLocaleBytes: await sumFiles(join(directory, 'locales'), (_path, name) => name.endsWith('.json')),
    manifestLocaleBytes: await sumFiles(join(directory, '_locales'), (_path, name) => name.endsWith('.json')),
  }
  return { target, directory, zipName, zipPath, config, metrics }
}

const verifyTarget = async report => {
  const failures = []
  const files = await collectFiles(report.directory)
  const manifestPath = join(report.directory, 'manifest.json')
  const manifestText = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestText)
  const expectedManifestVersion = report.target === 'chrome-mv3' ? 3 : 2

  if (manifest.version !== packageJson.version) {
    failures.push(`manifest version ${manifest.version} does not match package.json ${packageJson.version}`)
  }
  if (manifest.manifest_version !== expectedManifestVersion) {
    failures.push(`manifest_version ${manifest.manifest_version} does not match ${expectedManifestVersion}`)
  }
  if (manifest.default_locale !== 'en') failures.push(`default_locale must be en, got ${manifest.default_locale}`)
  if (JSON.stringify([...(manifest.permissions ?? [])].sort()) !== JSON.stringify([...expectedPermissions].sort())) {
    failures.push(`permissions must be ${expectedPermissions.join(', ')}, got ${(manifest.permissions ?? []).join(', ')}`)
  }
  if (manifest.host_permissions?.length) failures.push(`host_permissions must be absent, got ${manifest.host_permissions.join(', ')}`)
  if (manifest.optional_permissions?.length)
    failures.push(`optional_permissions must be absent, got ${manifest.optional_permissions.join(', ')}`)
  if (!hasRuntimeResources(manifest)) {
    failures.push('web_accessible_resources must expose locales/*.json and settings.html to YouTube')
  }
  if (!files.includes('settings.html')) failures.push('settings extension page is missing')

  const dataCollectionPermissions = manifest.browser_specific_settings?.gecko?.data_collection_permissions
  if (report.target === 'firefox-mv2') {
    if (JSON.stringify(dataCollectionPermissions?.required) !== JSON.stringify(['none'])) {
      failures.push('Firefox must declare data_collection_permissions.required as none')
    }
    if (dataCollectionPermissions?.optional?.length) {
      failures.push(`Firefox optional data collection permissions must be absent, got ${dataCollectionPermissions.optional.join(', ')}`)
    }
  } else if (dataCollectionPermissions) {
    failures.push('Chrome manifest must not contain Firefox data collection permissions')
  }

  if (manifest.content_scripts?.length !== 1) failures.push(`expected one content script, got ${manifest.content_scripts?.length ?? 0}`)
  const contentScript = manifest.content_scripts?.[0]
  if (JSON.stringify(contentScript?.matches) !== JSON.stringify(expectedContentScriptMatches)) {
    failures.push(`content script matches must be ${expectedContentScriptMatches.join(', ')}`)
  }
  for (const script of contentScript?.js ?? []) {
    if (!files.includes(script)) failures.push(`content script file is missing: ${script}`)
  }

  const runtimeLocales = localeCodes(files, /^locales\/([^/]+)\.json$/).filter(locale => locale !== '_keys')
  const manifestLocales = localeCodes(files, /^_locales\/([^/]+)\/messages\.json$/)
  if (runtimeLocales.length !== 55) failures.push(`expected 55 runtime locales, got ${runtimeLocales.length}`)
  if (JSON.stringify(manifestLocales) !== JSON.stringify(runtimeLocales)) {
    failures.push('runtime and manifest locale inventories differ')
  }

  for (const file of [
    ...files.filter(file => /^locales\/[^/]+\.json$/.test(file)),
    ...files.filter(file => /^_locales\/[^/]+\/messages\.json$/.test(file)),
  ]) {
    try {
      JSON.parse(await readFile(join(report.directory, file), 'utf8'))
    } catch (error) {
      failures.push(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  failures.push(...findForbiddenFiles(files))

  const zipEntries = await readZipEntries(report.zipPath)
  const zipFiles = [...zipEntries.keys()].filter(file => !file.endsWith('/')).sort()
  if (JSON.stringify(zipFiles) !== JSON.stringify(files)) failures.push('ZIP file inventory differs from the generated extension directory')
  const zipManifest = zipEntries.get('manifest.json')?.toString('utf8')
  if (zipManifest !== manifestText) failures.push('ZIP manifest.json differs from the generated manifest.json')
  failures.push(...findForbiddenFiles(zipFiles).map(failure => `ZIP ${failure}`))

  for (const [metric, budget] of Object.entries(report.config.budgets)) {
    const value = report.metrics[metric]
    if (value == null) failures.push(`${metric}: package ZIP is missing`)
    else if (value > budget) failures.push(`${metric}: ${value} > ${budget}`)
  }

  return {
    target: report.target,
    zip: report.zipName,
    fileCount: files.length,
    localeCount: runtimeLocales.length,
    metrics: report.metrics,
    failures,
  }
}

const verifySourcePackage = async () => {
  const zipName = `youtube-live-chat-fullscreen-${packageJson.version}-sources.zip`
  const zipPath = join(outputRoot, zipName)
  const failures = []
  const zipBytes = await stat(zipPath)
    .then(file => file.size)
    .catch(() => null)

  if (zipBytes === null) {
    return { target: 'sources', zip: zipName, metrics: { zipBytes }, failures: ['sources ZIP is missing'] }
  }
  if (zipBytes > sourcePackagePolicy.budgetBytes) {
    failures.push(`zipBytes: ${zipBytes} > ${sourcePackagePolicy.budgetBytes}`)
  }

  const entries = await readZipEntries(zipPath)
  const files = [...entries.keys()].filter(file => !file.endsWith('/')).sort()
  const rootFiles = new Set(sourcePackagePolicy.rootFiles)

  for (const file of sourcePackagePolicy.rootFiles) {
    if (!files.includes(file)) failures.push(`required source file is missing: ${file}`)
  }
  for (const file of sourcePackagePolicy.requiredFiles) {
    if (!files.includes(file)) failures.push(`required rebuild input is missing: ${file}`)
  }
  for (const prefix of sourcePackagePolicy.allowedPrefixes) {
    if (!files.some(file => file.startsWith(prefix))) failures.push(`required source directory is empty: ${prefix}`)
  }
  for (const prefix of sourcePackagePolicy.forbiddenPrefixes) {
    for (const file of files.filter(file => file.startsWith(prefix))) failures.push(`unnecessary source file: ${file}`)
  }

  for (const file of files) {
    const allowed = rootFiles.has(file) || sourcePackagePolicy.allowedPrefixes.some(prefix => file.startsWith(prefix))
    if (!allowed) failures.push(`source file is outside the allowlist: ${file}`)
    if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file) || /(^|\/)__tests__(\/|$)/.test(file)) {
      failures.push(`test file must not be shipped in source ZIP: ${file}`)
    }
  }

  const sourceReview = entries.get('SOURCE_CODE_REVIEW.md')?.toString('utf8') ?? ''
  if (!sourceReview.includes('yarn install --immutable') || !sourceReview.includes('yarn zip:firefox')) {
    failures.push('SOURCE_CODE_REVIEW.md must document the immutable install and Firefox rebuild commands')
  }

  const sourcePackageJson = entries.get('package.json')?.toString('utf8')
  if (sourcePackageJson) {
    try {
      const parsed = JSON.parse(sourcePackageJson)
      if (parsed.version !== packageJson.version) failures.push(`source package version ${parsed.version} does not match ${packageJson.version}`)
      if (parsed.packageManager !== packageJson.packageManager) {
        failures.push(`source package manager ${parsed.packageManager} does not match ${packageJson.packageManager}`)
      }
    } catch (error) {
      failures.push(`source package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return {
    target: 'sources',
    zip: zipName,
    fileCount: files.length,
    metrics: { zipBytes },
    failures,
  }
}

const reports = await Promise.all(Object.entries(sizePolicy).map(([target, config]) => measureTarget(target, config)))
const results = await Promise.all(reports.map(verifyTarget))
results.push(await verifySourcePackage())

console.log(JSON.stringify({ version: packageJson.version, results }, null, 2))
const failures = results.flatMap(result => result.failures.map(failure => `${result.target}: ${failure}`))
if (failures.length > 0) {
  // biome-ignore lint/suspicious/noConsole: CLI failures belong on stderr.
  console.error(`Package contract failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Production package contracts passed')
}
