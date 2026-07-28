import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLocaleCache, loadLocaleMessages } from './loader'

const originalFetch = globalThis.fetch

const jsonResponse = (value: unknown, ok = true) =>
  ({
    ok,
    json: vi.fn(async () => value),
  }) as unknown as Response

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
})
