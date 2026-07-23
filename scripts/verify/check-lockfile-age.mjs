#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: verification CLI prints status and diagnostics */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const DEFAULT_BASE = 'origin/main'
const DEFAULT_REGISTRY = 'https://registry.npmjs.org'

const locatorKey = ({ name, version }) => `${name}\0${version}`

export const extractNpmLocators = lockfile => {
  const locators = new Map()
  const resolutionPattern = /^  resolution: "([^"]+)"\s*$/gm

  for (const match of lockfile.matchAll(resolutionPattern)) {
    const locator = match[1]
    const markerIndex = locator.lastIndexOf('@npm:')
    if (markerIndex <= 0) continue

    const name = locator.slice(0, markerIndex)
    const version = locator
      .slice(markerIndex + '@npm:'.length)
      .split('::', 1)[0]
      .split('?', 1)[0]
    if (!/^(@[^/]+\/)?[^@/]+$/.test(name)) continue
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) continue

    locators.set(locatorKey({ name, version }), { name, version })
  }

  return locators
}

export const findNewNpmLocators = (baseLockfile, currentLockfile) => {
  const baseLocators = extractNpmLocators(baseLockfile)
  return [...extractNpmLocators(currentLockfile).entries()]
    .filter(([key]) => !baseLocators.has(key))
    .map(([, locator]) => locator)
    .sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version))
}

export const readMinimalAgeMinutes = yarnrc => {
  const match = yarnrc.match(/^npmMinimalAgeGate:\s*([^#\s]+)(?:\s*#.*)?$/m)
  if (!match) throw new Error('Missing npmMinimalAgeGate in .yarnrc.yml.')

  const duration = match[1]
  const durationMatch = duration.match(/^(\d+(?:\.\d+)?)(m|h|d)$/)
  if (!durationMatch) {
    throw new Error(`Unsupported npmMinimalAgeGate value "${duration}". Use an explicit duration such as 4320m.`)
  }

  const value = Number(durationMatch[1])
  const multiplier = { m: 1, h: 60, d: 24 * 60 }[durationMatch[2]]
  const minutes = value * multiplier
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('npmMinimalAgeGate must be greater than zero.')
  return minutes
}

const packageMetadataUrl = (registry, packageName) =>
  `${registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}`

export const fetchPublishTimes = async ({ packageName, registry = DEFAULT_REGISTRY, fetchImpl = fetch }) => {
  const url = packageMetadataUrl(registry, packageName)
  let response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'youtube-live-chat-fullscreen-dependency-age-gate',
      },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    throw new Error(`Could not query publish times for ${packageName}: ${error.message}`)
  }

  if (!response.ok) {
    throw new Error(`Could not query publish times for ${packageName}: registry returned ${response.status} ${response.statusText}.`)
  }

  let metadata
  try {
    metadata = await response.json()
  } catch (error) {
    throw new Error(`Could not read publish times for ${packageName}: ${error.message}`)
  }

  if (!metadata || typeof metadata.time !== 'object' || metadata.time === null) {
    throw new Error(`Registry metadata for ${packageName} did not include publish times.`)
  }
  return metadata.time
}

export const verifyLocatorAges = async ({
  locators,
  minimalAgeMinutes,
  now = new Date(),
  registry = DEFAULT_REGISTRY,
  fetchImpl = fetch,
  concurrency = 8,
}) => {
  const versionsByPackage = new Map()
  for (const locator of locators) {
    const versions = versionsByPackage.get(locator.name) ?? []
    versions.push(locator.version)
    versionsByPackage.set(locator.name, versions)
  }

  const failures = []
  const packages = [...versionsByPackage.entries()]
  let nextPackageIndex = 0
  const verifyNextPackage = async () => {
    while (nextPackageIndex < packages.length) {
      const [packageName, versions] = packages[nextPackageIndex]
      nextPackageIndex += 1
      const publishTimes = await fetchPublishTimes({ packageName, registry, fetchImpl })
      for (const version of versions) {
        const publishedAtValue = publishTimes[version]
        const publishedAt = new Date(publishedAtValue)
        if (typeof publishedAtValue !== 'string' || Number.isNaN(publishedAt.getTime())) {
          failures.push(`${packageName}@${version}: registry metadata has no valid publish time`)
          continue
        }

        const ageMinutes = (now.getTime() - publishedAt.getTime()) / 60_000
        if (ageMinutes < minimalAgeMinutes) {
          const ageHours = Math.max(0, ageMinutes / 60).toFixed(1)
          failures.push(
            `${packageName}@${version}: published ${publishedAt.toISOString()} (${ageHours} hours old; minimum is ${(minimalAgeMinutes / 60).toFixed(1)} hours)`,
          )
        }
      }
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), packages.length)
  await Promise.all(Array.from({ length: workerCount }, () => verifyNextPackage()))

  if (failures.length > 0) {
    failures.sort()
    throw new Error(`Dependency release age gate failed:\n${failures.map(failure => `- ${failure}`).join('\n')}`)
  }
}

const parseArgs = argv => {
  let base = process.env.YLC_AGE_GATE_BASE ?? DEFAULT_BASE
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--base') {
      base = argv[index + 1]
      index += 1
    } else if (argument.startsWith('--base=')) {
      base = argument.slice('--base='.length)
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }
  if (!base) throw new Error('--base requires a Git ref.')
  return { base }
}

const readBaseLockfile = async base => {
  let mergeBase
  try {
    const result = await execFileAsync('git', ['merge-base', 'HEAD', base])
    mergeBase = result.stdout.trim()
  } catch (error) {
    throw new Error(`Could not determine merge-base for ${base}: ${error.message}`)
  }
  if (!mergeBase) throw new Error(`git merge-base returned no commit for ${base}.`)

  try {
    const result = await execFileAsync('git', ['show', `${mergeBase}:yarn.lock`], { maxBuffer: 20 * 1024 * 1024 })
    return { lockfile: result.stdout, mergeBase }
  } catch (error) {
    throw new Error(`Could not read yarn.lock at merge-base ${mergeBase}: ${error.message}`)
  }
}

const main = async () => {
  const { base } = parseArgs(process.argv)
  const rootDir = process.cwd()
  const [currentLockfile, yarnrc, baseLockfile] = await Promise.all([
    fs.readFile(path.join(rootDir, 'yarn.lock'), 'utf8'),
    fs.readFile(path.join(rootDir, '.yarnrc.yml'), 'utf8'),
    readBaseLockfile(base),
  ])
  const minimalAgeMinutes = readMinimalAgeMinutes(yarnrc)
  const locators = findNewNpmLocators(baseLockfile.lockfile, currentLockfile)

  if (locators.length === 0) {
    console.log(`Dependency release age gate passed: no new npm locators since ${baseLockfile.mergeBase}.`)
    return
  }

  await verifyLocatorAges({ locators, minimalAgeMinutes })
  console.log(
    `Dependency release age gate passed: ${locators.length} new npm locator(s) are at least ${(minimalAgeMinutes / 60).toFixed(1)} hours old.`,
  )
}

const isDirectExecution = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectExecution) {
  await main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
