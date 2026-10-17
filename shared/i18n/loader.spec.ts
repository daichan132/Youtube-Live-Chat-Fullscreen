import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadExtensionAsset } from '@/shared/runtime/extensionAssets'
import { clearLocaleCache, loadLocaleMessages } from './loader'

vi.mock('@/shared/runtime/extensionAssets', () => ({ loadExtensionAsset: vi.fn() }))
const loadAsset = vi.mocked(loadExtensionAsset)

describe('loadLocaleMessages', () => {
  beforeEach(clearLocaleCache)
  afterEach(() => vi.resetAllMocks())

  it('falls back to English when the selected locale asset is unavailable', async () => {
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') throw new Error('Extension asset unavailable')
      return ['Theme']
    })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
  })

  it('rejects when the English base locale is unavailable', async () => {
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      throw new Error('Extension asset unavailable')
    })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Extension asset unavailable')
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

  it('retries the selected locale instead of permanently caching the English fallback', async () => {
    let available = false
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      if (asset === 'ja') {
        if (!available) throw new Error('Extension asset unavailable')
        return ['テーマ']
      }
      return ['Theme']
    })
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'Theme' })
    available = true
    await expect(loadLocaleMessages('ja')).resolves.toEqual({ 'popup.theme': 'テーマ' })
  })

  it('retries a failed English bundle while sharing requests and reusing loaded keys', async () => {
    let available = false
    loadAsset.mockImplementation(async asset => {
      if (asset === '_keys') return ['popup.theme']
      if (!available) throw new Error('Extension asset unavailable')
      return ['Theme']
    })
    await expect(loadLocaleMessages('en')).rejects.toThrow('Extension asset unavailable')
    available = true
    const first = loadLocaleMessages('en')
    expect(loadLocaleMessages('en')).toBe(first)
    await expect(first).resolves.toEqual({ 'popup.theme': 'Theme' })
    expect(loadAsset.mock.calls.filter(([asset]) => asset === '_keys')).toHaveLength(1)
  })
})
