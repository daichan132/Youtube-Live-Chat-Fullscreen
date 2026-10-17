import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { type AppRuntime, createAppRuntime } from '@/shared/runtime/createAppRuntime'
import { EMPTY_MESSAGES, localeStateAtom } from '@/shared/state/atoms'
import { DEFAULT_GLOBAL_SETTINGS } from './defaults'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import { createSettingsRepository, type SettingsRepository } from './repository'
import { LOCALE_STORAGE_KEY } from './storageKeys'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

const releases: (() => void)[] = []
const repositories: SettingsRepository[] = []
const runtimes: AppRuntime[] = []

const createLegacyReader = () => {
  const repository = createSettingsRepository('legacy-reader', { getItem: () => 'ja' })
  repositories.push(repository)
  return repository
}

const holdStartupReads = () => {
  const currentCaptured = deferred()
  const compatibilityCaptured = deferred()
  const release = deferred()
  releases.push(release.resolve)
  const actualGet = browser.storage.local.get.bind(browser.storage.local)
  vi.spyOn(browser.storage.local, 'get').mockImplementation(async keys => {
    const values = await actualGet(keys)
    const requestedKeys: readonly unknown[] = Array.isArray(keys) ? keys : []
    if (requestedKeys.includes(LOCALE_STORAGE_KEY)) currentCaptured.resolve()
    if (requestedKeys.includes('globalSettingStore')) {
      compatibilityCaptured.resolve()
      await release.promise
    }
    return values
  })
  return {
    captured: Promise.all([currentCaptured.promise, compatibilityCaptured.promise]),
    release: release.resolve,
  }
}

const readStoredLocale = async () => (await browser.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]

beforeEach(async () => {
  await browser.storage.local.clear()
})

afterEach(async () => {
  for (const release of releases.splice(0)) release()
  try {
    await Promise.all(repositories.splice(0).map(repository => repository.flush()))
  } finally {
    for (const runtime of runtimes.splice(0)) runtime.dispose()
    vi.restoreAllMocks()
  }
})

describe('legacy locale copy during startup', () => {
  it('preserves a newer external locale in storage and the initializing runtime', async () => {
    const reads = holdStartupReads()
    const repository = createLegacyReader()
    const initialization = createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
    await reads.captured

    await browser.storage.local.set({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'fr' },
    })
    reads.release()
    const runtime = await initialization
    runtimes.push(runtime)
    await repository.flush()

    expect(await readStoredLocale()).toMatchObject({ writerId: 'other-context', value: 'fr' })
    expect(runtime.store.get(localeStateAtom).code).toBe('fr')
  })

  it('preserves an external commit during a direct load and releases its temporary observer', async () => {
    const reads = holdStartupReads()
    const repository = createLegacyReader()
    const loading = repository.load()
    await reads.captured

    await browser.storage.local.set({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'fr' },
    })
    reads.release()
    await loading
    await repository.flush()

    expect(await readStoredLocale()).toMatchObject({ writerId: 'other-context', value: 'fr' })
    expect(browser.storage.local.onChanged.hasListeners()).toBe(false)
  })

  it('preserves an explicit local locale saved while startup reads are pending', async () => {
    const reads = holdStartupReads()
    const repository = createLegacyReader()
    const loading = repository.load()
    await reads.captured

    await repository.saveLocale('fr')
    reads.release()
    await loading
    await repository.flush()

    expect(await readStoredLocale()).toMatchObject({ writerId: 'legacy-reader', value: 'fr' })
    expect(browser.storage.local.onChanged.hasListeners()).toBe(false)
  })

  it('preserves a local locale intent already waiting to commit before load begins', async () => {
    const reads = holdStartupReads()
    const writeStarted = deferred()
    const releaseWrite = deferred()
    releases.push(releaseWrite.resolve)
    const actualSet = browser.storage.local.set.bind(browser.storage.local)
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async values => {
      const locale = (values as Record<string, { value?: unknown }>)[LOCALE_STORAGE_KEY]
      if (locale?.value === 'fr') {
        writeStarted.resolve()
        await releaseWrite.promise
      }
      await actualSet(values)
    })
    const repository = createLegacyReader()
    const save = repository.saveLocale('fr')
    await writeStarted.promise
    const loading = repository.load()
    await reads.captured

    reads.release()
    await loading
    releaseWrite.resolve()
    await save
    await repository.flush()

    expect(await readStoredLocale()).toMatchObject({ writerId: 'legacy-reader', value: 'fr' })
    expect(browser.storage.local.onChanged.hasListeners()).toBe(false)
  })

  it('preserves an external locale received while a compatibility copy waits behind an import', async () => {
    const importStarted = deferred()
    const releaseImport = deferred()
    releases.push(releaseImport.resolve)
    const actualSet = browser.storage.local.set.bind(browser.storage.local)
    vi.spyOn(browser.storage.local, 'set').mockImplementation(async values => {
      if (Object.keys(values).length > 1) {
        importStarted.resolve()
        await releaseImport.promise
      }
      await actualSet(values)
    })
    const repository = createLegacyReader()
    const importing = repository.replaceSettings(DEFAULT_GLOBAL_SETTINGS, DEFAULT_CHAT_SETTINGS)
    await importStarted.promise
    await repository.load()

    await browser.storage.local.set({
      [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-context', value: 'fr' },
    })
    releaseImport.resolve()
    await importing
    await repository.flush()

    expect(await readStoredLocale()).toMatchObject({ writerId: 'other-context', value: 'fr' })
    expect(browser.storage.local.onChanged.hasListeners()).toBe(false)
  })
})
