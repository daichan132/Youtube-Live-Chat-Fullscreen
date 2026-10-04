import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLocaleCache, loadLocaleMessages } from './loader'

const originalFetch = globalThis.fetch

const jsonResponse = (value: unknown, ok = true) =>
  ({
    ok,
    json: vi.fn(async () => value),
  }) as unknown as Response

const mockAssets = (assets: Record<string, unknown>) => {
  const fetchAsset = vi.fn(async (input: string | URL | Request) => {
    const url = String(input)
    const asset = url.split('/locales/')[1]
    if (!asset || !Object.hasOwn(assets, asset)) throw new Error(`Unexpected URL: ${url}`)
    return jsonResponse(assets[asset])
  })
  vi.stubGlobal('fetch', fetchAsset)
  return fetchAsset
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => {
    resolve = next
  })
  return { promise, resolve }
}

describe('loadLocaleMessages', () => {
  beforeEach(() => {
    clearLocaleCache()
  })

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch)
  })

  it('falls back to English messages when the selected locale asset cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.endsWith('/locales/_keys.json')) return jsonResponse(['popup.theme'])
        if (url.endsWith('/locales/ja.json')) return jsonResponse(null, false)
        if (url.endsWith('/locales/en.json')) return jsonResponse(['Theme'])
        throw new Error(`Unexpected URL: ${url}`)
      }),
    )

    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('rejects when the English base locale cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input)
        if (url.endsWith('/locales/_keys.json')) return jsonResponse(['popup.theme'])
        if (url.endsWith('/locales/en.json')) return jsonResponse(null, false)
        throw new Error(`Unexpected URL: ${url}`)
      }),
    )

    await expect(loadLocaleMessages('en')).rejects.toThrow('Locale asset not found')
  })

  it('restores sparse messages from shared defaults and preserves string overrides including empty strings', async () => {
    const fetchAsset = mockAssets({
      '_keys.json': ['popup.theme', 'popup.export', 'popup.import'],
      '_defaults.json': ['Theme', 'Export', 'Import'],
      'ja.json': [null, '書き出し', ''],
      'de.json': ['Design', 'Exportieren', 'Importieren'],
    })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({
      'popup.theme': 'Theme',
      'popup.export': '書き出し',
      'popup.import': '',
    })
    await expect(loadLocaleMessages('de')).resolves.toEqual({
      'popup.theme': 'Design',
      'popup.export': 'Exportieren',
      'popup.import': 'Importieren',
    })
    expect(fetchAsset).toHaveBeenCalledTimes(4)
  })

  it('loads a full string bundle without requesting the defaults asset', async () => {
    const fetchAsset = mockAssets({ '_keys.json': ['popup.theme'], 'en.json': ['Theme'] })
    const loading = loadLocaleMessages('en')
    await expect(loading).resolves.toEqual({ 'popup.theme': 'Theme' })
    expect(loadLocaleMessages('en')).toBe(loading)
    expect(fetchAsset).toHaveBeenCalledTimes(2)
  })

  it.each([
    { label: 'non-array', value: {} },
    { label: 'short array', value: [] },
    { label: 'long array', value: ['Theme', 'Export'] },
    { label: 'null default', value: [null] },
    { label: 'number default', value: [42] },
    { label: 'object default', value: [{}] },
  ])('rejects $label in the shared defaults asset', async ({ value }) => {
    mockAssets({ '_keys.json': ['popup.theme'], '_defaults.json': value, 'en.json': [null] })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Invalid locale default asset')
  })

  it.each([
    { label: 'non-array', value: {} },
    { label: 'short array', value: [] },
    { label: 'long array', value: ['Theme', 'Export'] },
    { label: 'number override', value: [42] },
    { label: 'boolean override', value: [false] },
    { label: 'object override', value: [{}] },
    { label: 'array override', value: [[]] },
  ])('falls back to English for a selected bundle with $label', async ({ value }) => {
    const fetchAsset = mockAssets({ '_keys.json': ['popup.theme'], 'ja.json': value, 'en.json': ['Theme'] })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
    expect(fetchAsset).toHaveBeenCalledTimes(3)
  })

  it('falls back to a sparse English bundle after an invalid selected bundle', async () => {
    const fetchAsset = mockAssets({
      '_keys.json': ['popup.theme'],
      '_defaults.json': ['Theme'],
      'ja.json': [false],
      'en.json': [null],
    })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
    expect(fetchAsset).toHaveBeenCalledTimes(4)
  })

  it('can fall back to a full English bundle when the selected sparse bundle needs malformed defaults', async () => {
    mockAssets({ '_keys.json': ['popup.theme'], '_defaults.json': [null], 'ja.json': [null], 'en.json': ['Theme'] })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('rejects malformed key assets before exposing messages', async () => {
    mockAssets({ '_keys.json': [42], 'en.json': ['Theme'] })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Invalid locale key asset')
  })

  it('shares in-flight keys, defaults and same-locale loads across simultaneous sparse bundles', async () => {
    const keys = deferred<unknown>()
    const defaults = deferred<unknown>()
    const japanese = deferred<unknown>()
    const german = deferred<unknown>()
    const responses: Record<string, Promise<unknown>> = {
      '_keys.json': keys.promise,
      '_defaults.json': defaults.promise,
      'ja.json': japanese.promise,
      'de.json': german.promise,
    }
    const fetchAsset = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const asset = url.split('/locales/')[1]
      if (!asset || !Object.hasOwn(responses, asset)) throw new Error(`Unexpected URL: ${url}`)
      return jsonResponse(await responses[asset])
    })
    vi.stubGlobal('fetch', fetchAsset)
    const first = loadLocaleMessages('ja')
    expect(loadLocaleMessages('ja')).toBe(first)
    const second = loadLocaleMessages('de')
    expect(fetchAsset).toHaveBeenCalledTimes(3)
    keys.resolve(['popup.theme', 'popup.export'])
    japanese.resolve([null, '書き出し'])
    german.resolve([null, 'Exportieren'])
    await vi.waitFor(() => expect(fetchAsset).toHaveBeenCalledTimes(4))
    defaults.resolve(['Theme', 'Export'])
    await expect(first).resolves.toEqual({ 'popup.theme': 'Theme', 'popup.export': '書き出し' })
    await expect(second).resolves.toEqual({ 'popup.theme': 'Theme', 'popup.export': 'Exportieren' })
    expect(loadLocaleMessages('de')).toBe(second)
    expect(fetchAsset).toHaveBeenCalledTimes(4)
  })

  it('clears keys, defaults and message caches before loading refreshed assets', async () => {
    const assets = { '_keys.json': ['popup.theme'], '_defaults.json': ['Theme'], 'ja.json': [null] }
    const fetchAsset = mockAssets(assets)
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
    assets['_defaults.json'] = ['Refreshed theme']
    clearLocaleCache()
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Refreshed theme' })
    expect(fetchAsset).toHaveBeenCalledTimes(6)
  })

  it('keeps pending loads isolated from keys and defaults fetched after clearing the cache', async () => {
    const oldKeys = deferred<unknown>()
    const oldMessages = deferred<unknown>()
    let keyRequests = 0
    let messageRequests = 0
    let defaultRequests = 0
    const fetchAsset = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('/locales/_keys.json')) {
        keyRequests += 1
        return jsonResponse(keyRequests === 1 ? await oldKeys.promise : ['popup.export'])
      }
      if (url.endsWith('/locales/ja.json')) {
        messageRequests += 1
        return jsonResponse(messageRequests === 1 ? await oldMessages.promise : [null])
      }
      if (url.endsWith('/locales/_defaults.json')) {
        defaultRequests += 1
        return jsonResponse([defaultRequests === 1 ? 'Fresh export' : 'Old theme'])
      }
      throw new Error(`Unexpected URL: ${url}`)
    })
    vi.stubGlobal('fetch', fetchAsset)
    const oldLoading = loadLocaleMessages('ja')
    clearLocaleCache()
    const freshLoading = loadLocaleMessages('ja')
    await expect(freshLoading).resolves.toEqual({ 'popup.export': 'Fresh export' })
    oldKeys.resolve(['popup.theme'])
    oldMessages.resolve([null])
    await expect(oldLoading).resolves.toEqual({ 'popup.theme': 'Old theme' })
    expect(loadLocaleMessages('ja')).toBe(freshLoading)
    expect(fetchAsset).toHaveBeenCalledTimes(6)
  })
})
