import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadExtensionAsset } from '@/shared/runtime/extensionAssets'
import { clearLocaleCache, loadLocaleMessages } from './loader'

vi.mock('@/shared/runtime/extensionAssets', () => ({ loadExtensionAsset: vi.fn() }))
const loadAsset = vi.mocked(loadExtensionAsset)

describe('loadLocaleMessages', () => {
  beforeEach(clearLocaleCache)
  afterEach(() => vi.resetAllMocks())

  it('rejects an unavailable requested locale without choosing another language', async () => {
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') throw new Error('Extension asset unavailable')
      return ['Theme']
    })
    await expect(loadLocaleMessages('ja')).rejects.toThrow('Extension asset unavailable')
  })

  it('retries the key asset after a temporary failure', async () => {
    let available = false
    loadAsset.mockImplementation(async asset => {
      if (!available) throw new Error('Extension asset unavailable')
      return asset === '_keys' ? ['popup.theme'] : ['Theme']
    })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Extension asset unavailable')
    available = true
    await expect(loadLocaleMessages('en')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('retries a previously unavailable requested locale', async () => {
    let available = false
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') {
        if (!available) throw new Error('Extension asset unavailable')
        return ['テーマ']
      }
      return ['Theme']
    })
    await expect(loadLocaleMessages('ja')).rejects.toThrow('Extension asset unavailable')
    available = true
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'テーマ' })
  })

  it('retries a failed English bundle and keeps successfully loaded keys', async () => {
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      throw new Error('Extension asset unavailable')
    })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Extension asset unavailable')
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') throw new Error('Keys no longer available')
      return ['Theme']
    })
    await expect(loadLocaleMessages('en')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('shares an in-flight request between callers', async () => {
    let resolveMessages!: (value: unknown) => void
    const pending = new Promise<unknown>(resolve => {
      resolveMessages = resolve
    })
    loadAsset.mockImplementation(async asset => (asset === '_keys' ? ['popup.theme'] : pending))

    const first = loadLocaleMessages('en')
    const second = loadLocaleMessages('en')
    resolveMessages(['Theme'])

    await expect(Promise.all([first, second])).resolves.toEqual([{ 'popup.theme': 'Theme' }, { 'popup.theme': 'Theme' }])
    expect(loadAsset.mock.calls.filter(([asset]) => asset === 'en')).toHaveLength(1)
  })

  it.each([
    { keys: 'popup.theme', messages: ['Theme'] },
    { keys: [123], messages: ['Theme'] },
    { keys: ['popup.theme'], messages: 'Theme' },
    { keys: ['popup.theme'], messages: ['Theme', 'Language'] },
    { keys: ['popup.theme'], messages: [123] },
  ])('rejects invalid bundle data and accepts a corrected retry: $keys / $messages', async ({ keys, messages }) => {
    loadAsset.mockImplementation(async asset => (asset === '_keys' ? keys : messages))
    await expect(loadLocaleMessages('en')).rejects.toThrow(/Invalid locale/)

    loadAsset.mockImplementation(async asset => (asset === '_keys' ? ['popup.theme'] : ['Theme']))
    await expect(loadLocaleMessages('en')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('keeps a newer successful load when an older request fails after cache reset', async () => {
    let rejectOld: (error: Error) => void = () => {}
    const oldMessages = new Promise<unknown>((_, reject) => {
      rejectOld = reject
    })
    loadAsset.mockImplementation(async asset => (asset === '_keys' ? ['popup.theme'] : oldMessages))
    const oldLoad = loadLocaleMessages('en')
    const oldFailure = expect(oldLoad).rejects.toThrow('Old request failed')

    clearLocaleCache()
    loadAsset.mockImplementation(async asset => (asset === '_keys' ? ['popup.theme'] : ['Theme']))
    await expect(loadLocaleMessages('en')).resolves.toEqual({ 'popup.theme': 'Theme' })
    rejectOld(new Error('Old request failed'))
    await oldFailure

    loadAsset.mockRejectedValue(new Error('Assets no longer available'))
    await expect(loadLocaleMessages('en')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })
})
