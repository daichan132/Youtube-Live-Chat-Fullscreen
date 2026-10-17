import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import type { LocaleCode } from '@/shared/i18n/generated/translationTypes'
import { clearLocaleCache } from '@/shared/i18n/loader'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { LOCALE_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { localeStateAtom } from '@/shared/state/atoms'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'
import { type ExtensionAsset, isExtensionAssetRequest } from './extensionAssets'

const sessions: { runtime: AppRuntime; repository: SettingsRepository }[] = []

// Keep the repository, message loader and runtime connected. Only packaged-asset
// responses are controlled at the browser messaging boundary.
const serveAssets = (read: (asset: ExtensionAsset) => unknown) => {
  const requested: ExtensionAsset[] = []
  vi.spyOn(browser.runtime, 'sendMessage').mockImplementation(async message => {
    if (!isExtensionAssetRequest(message)) throw new Error('Unexpected asset request')
    requested.push(message.asset)
    try {
      return { ok: true, value: read(message.asset) }
    } catch {
      return { ok: false }
    }
  })
  return () => requested.filter(asset => asset !== '_keys')
}

const repositoryFor = async (locale: LocaleCode) => {
  await chrome.storage.local.set({
    [LOCALE_STORAGE_KEY]: { schemaVersion: 1, writerId: 'previous-session', value: locale },
  })
  return createSettingsRepository('current-session', null)
}

const start = async (repository: SettingsRepository) => {
  const runtime = await createAppRuntime(repository)
  sessions.push({ runtime, repository })
  return runtime
}

const storedLocale = async () => (await chrome.storage.local.get(LOCALE_STORAGE_KEY))[LOCALE_STORAGE_KEY]

beforeEach(async () => {
  clearLocaleCache()
  await chrome.storage.local.clear()
})

afterEach(async () => {
  await Promise.allSettled(sessions.map(({ repository }) => repository.flush()))
  for (const { runtime } of sessions.splice(0)) runtime.dispose()
  clearLocaleCache()
  vi.restoreAllMocks()
})

describe('locale fallback through packaged assets and settings', () => {
  it('uses English messages while preserving the stored language selection during startup', async () => {
    const requests = serveAssets(asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') throw new Error('Japanese asset unavailable')
      return ['Theme']
    })
    const runtime = await start(await repositoryFor('ja'))

    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'Theme' } })
    expect(await storedLocale()).toEqual({ schemaVersion: 1, writerId: 'previous-session', value: 'ja' })
    expect(requests()).toEqual(['ja', 'en'])
  })

  it.each(['ja', 'en'] as const)('tries each required bundle once when %s startup cannot load messages', async locale => {
    const requests = serveAssets(asset => {
      if (asset === '_keys') return ['popup.theme']
      throw new Error('Locale assets unavailable')
    })

    await expect(start(await repositoryFor(locale))).rejects.toThrow('Extension asset unavailable')

    expect(requests()).toEqual(locale === 'en' ? ['en'] : ['ja', 'en'])
    expect(await storedLocale()).toMatchObject({ writerId: 'previous-session', value: locale })
  })

  it('can retry initialization after both selected and English assets were unavailable', async () => {
    let englishAvailable = false
    const requests = serveAssets(asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja' || !englishAvailable) throw new Error('Locale asset unavailable')
      return ['Theme']
    })
    const repository = await repositoryFor('ja')
    await expect(start(repository)).rejects.toThrow('Extension asset unavailable')

    englishAvailable = true
    const runtime = await start(repository)

    expect(requests()).toEqual(['ja', 'en', 'ja', 'en'])
    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'Theme' } })
    expect(await storedLocale()).toMatchObject({ writerId: 'previous-session', value: 'ja' })
  })

  it('reloads a recovered selected bundle instead of caching its English fallback', async () => {
    let japaneseAvailable = false
    const requests = serveAssets(asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') {
        if (!japaneseAvailable) throw new Error('Japanese asset unavailable')
        return ['テーマ']
      }
      return ['Theme']
    })
    const runtime = await start(await repositoryFor('ja'))

    japaneseAvailable = true
    await runtime.setLocale('ja')

    expect(requests()).toEqual(['ja', 'en', 'ja'])
    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'テーマ' } })
    expect(await storedLocale()).toMatchObject({ writerId: 'current-session', value: 'ja' })
  })

  it('saves the locally selected language when its messages use the English fallback', async () => {
    const requests = serveAssets(asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') throw new Error('Japanese asset unavailable')
      return asset === 'fr' ? ['Thème'] : ['Theme']
    })
    const runtime = await start(await repositoryFor('fr'))
    const writes = vi.spyOn(chrome.storage.local, 'set')

    await runtime.setLocale('ja')

    expect(requests()).toEqual(['fr', 'ja', 'en'])
    expect(runtime.store.get(localeStateAtom)).toMatchObject({ code: 'ja', messages: { 'popup.theme': 'Theme' } })
    expect(await storedLocale()).toEqual({ schemaVersion: 1, writerId: 'current-session', value: 'ja' })
    expect(writes.mock.calls.filter(([items]) => Object.hasOwn(items, LOCALE_STORAGE_KEY))).toHaveLength(1)
  })
})
