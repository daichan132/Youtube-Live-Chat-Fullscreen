import { afterEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { isExtensionAssetRequest, loadContentStyles, loadExtensionAsset } from './extensionAssets'
import { serveExtensionAsset } from './serveExtensionAsset'

const { sendMessage } = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'asset-test', sendMessage, getURL: (path: string) => `chrome-extension://asset-test/${path.replace(/^\//, '')}` },
  },
}))

const json = (value: unknown, ok = true) => ({ ok, json: async () => value, text: async () => String(value) }) as Response

afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

describe('extension asset delivery', () => {
  it('allows only exact requests for known packaged assets', () => {
    for (const asset of ['en', 'ja', '_keys', 'content-style']) expect(isExtensionAssetRequest({ type: 'ylc:asset', asset })).toBe(true)
    for (const asset of ['../manifest', '/locales/en.json', 'https://example.test', 'unsupported']) {
      expect(isExtensionAssetRequest({ type: 'ylc:asset', asset })).toBe(false)
    }
    expect(isExtensionAssetRequest({ type: 'ylc:asset', asset: 'en', url: 'extra' })).toBe(false)
    expect(isExtensionAssetRequest(null)).toBe(false)
  })

  it('rejects foreign senders without fetching and leaves unrelated messages unhandled', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(serveExtensionAsset({ type: 'ylc:asset', asset: 'en' }, { id: 'foreign' })).toBeUndefined()
    expect(serveExtensionAsset({ type: 'ylc:status' }, { id: browser.runtime.id })).toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads JSON and CSS from extension-owned paths', async () => {
    const fetchMock = vi.fn(async (url: string) => json(url.endsWith('.css') ? '.overlay{color:red}' : ['Theme']))
    vi.stubGlobal('fetch', fetchMock)
    const sender = { id: browser.runtime.id }
    await expect(serveExtensionAsset({ type: 'ylc:asset', asset: 'en' }, sender)).resolves.toEqual({ ok: true, value: ['Theme'] })
    await expect(serveExtensionAsset({ type: 'ylc:asset', asset: 'content-style' }, sender)).resolves.toEqual({
      ok: true,
      value: '.overlay{color:red}',
    })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      browser.runtime.getURL('/locales/en.json'),
      'chrome-extension://asset-test/content-scripts/content.css',
    ])
  })

  it('returns a sanitized failure for missing assets and fetch/parse errors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(null, false))
      .mockRejectedValueOnce(new Error('private path'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('invalid JSON')
        },
      })
    vi.stubGlobal('fetch', fetchMock)
    for (let i = 0; i < 3; i++) {
      await expect(serveExtensionAsset({ type: 'ylc:asset', asset: 'en' }, { id: browser.runtime.id })).resolves.toEqual({ ok: false })
    }
  })

  it('uses extension messaging without fetching in the page context', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const send = sendMessage.mockResolvedValue({ ok: true, value: ['Theme'] })
    await expect(loadExtensionAsset('en')).resolves.toEqual(['Theme'])
    expect(send).toHaveBeenCalledWith({ type: 'ylc:asset', asset: 'en' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects unsuccessful responses and empty or invalid styles', async () => {
    const send = sendMessage
    for (const response of [undefined, { ok: false }, { ok: true, value: '' }, { ok: true, value: [] }]) {
      send.mockResolvedValueOnce(response)
      await expect(loadContentStyles()).rejects.toThrow()
    }
    send.mockResolvedValueOnce({ ok: true, value: '.overlay{color:red}' })
    await expect(loadContentStyles()).resolves.toBe('.overlay{color:red}')
  })
})
