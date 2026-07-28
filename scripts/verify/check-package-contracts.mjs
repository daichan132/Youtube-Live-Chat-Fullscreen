#!/usr/bin/env node
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const root = fileURLToPath(new URL('../..', import.meta.url))
const outputRoot = join(root, '.output')
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const sizePolicy = JSON.parse(await readFile(join(root, 'config/package-size-budget.json'), 'utf8'))
const expectedPermissions = ['activeTab', 'storage']
const expectedContentScriptMatches = ['*://www.youtube.com/*']
const forbiddenProductionFiles = [
  { label: 'E2E bridge', matches: file => file === 'e2e.html' },
  { label: 'source map', matches: file => file.endsWith('.map') },
  { label: 'test file', matches: file => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(file) },
  { label: 'fixture asset', matches: file => /(^|\/)fixtures?(\/|$)/i.test(file) },
  { label: 'test bridge asset', matches: file => /(^|\/)test-bridge(?:\/|$)/i.test(file) },
]

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

const hasRuntimeLocaleResource = manifest => {
  const resources = manifest.web_accessible_resources ?? []
  const localeResources = resources.filter(resource =>
    typeof resource === 'string' ? resource === 'locales/*.json' : resource.resources?.includes('locales/*.json'),
  )
  if (localeResources.length !== 1) return false
  const [resource] = localeResources
  if (typeof resource === 'string') return manifest.manifest_version === 2
  return (
    JSON.stringify(resource.resources) === JSON.stringify(['locales/*.json']) &&
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
  if (!hasRuntimeLocaleResource(manifest)) failures.push('web_accessible_resources must expose locales/*.json only to YouTube')

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

const reports = await Promise.all(Object.entries(sizePolicy).map(([target, config]) => measureTarget(target, config)))
const results = await Promise.all(reports.map(verifyTarget))
const sourcesZip = join(outputRoot, `youtube-live-chat-fullscreen-${packageJson.version}-sources.zip`)
const sourcesZipExists = await stat(sourcesZip)
  .then(file => file.isFile())
  .catch(() => false)
if (!sourcesZipExists) results.push({ target: 'sources', failures: ['sources ZIP is missing'] })

console.log(JSON.stringify({ version: packageJson.version, results }, null, 2))
const failures = results.flatMap(result => result.failures.map(failure => `${result.target}: ${failure}`))
if (failures.length > 0) {
  // biome-ignore lint/suspicious/noConsole: CLI failures belong on stderr.
  console.error(`Package contract failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Production package contracts passed')
}
