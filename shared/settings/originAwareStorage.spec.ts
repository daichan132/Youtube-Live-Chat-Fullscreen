import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}))

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: storage,
}))

import { getStorageChangeOriginId, originAwareLocalStorage, SETTINGS_STORAGE_ORIGIN_ID } from './originAwareStorage'

describe('originAwareLocalStorage', () => {
  beforeEach(() => {
    storage.getItem.mockReset()
    storage.setItem.mockReset()
    storage.removeItem.mockReset()
  })

  it('adds the current context origin to persisted Zustand envelopes', async () => {
    await originAwareLocalStorage.setItem('settings', JSON.stringify({ state: { fontSize: 18 }, version: 6 }))

    expect(storage.setItem).toHaveBeenCalledTimes(1)
    const value = storage.setItem.mock.calls[0]?.[1]
    expect(JSON.parse(value)).toEqual({
      state: { fontSize: 18 },
      version: 6,
      originId: SETTINGS_STORAGE_ORIGIN_ID,
    })
  })

  it('reads an origin from string and object storage changes', () => {
    expect(getStorageChangeOriginId({ newValue: JSON.stringify({ originId: 'string-origin' }) })).toBe('string-origin')
    expect(getStorageChangeOriginId({ newValue: { originId: 'object-origin' } })).toBe('object-origin')
  })

  it('treats legacy, removed, and malformed values as external changes', () => {
    expect(getStorageChangeOriginId({ newValue: JSON.stringify({ state: {} }) })).toBeNull()
    expect(getStorageChangeOriginId({ newValue: '{' })).toBeNull()
    expect(getStorageChangeOriginId({})).toBeNull()
  })
})
