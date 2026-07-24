import { localStorage as extensionLocalStorage } from 'redux-persist-webextension-storage'

const createOriginId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `ylc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const SETTINGS_STORAGE_ORIGIN_ID = createOriginId()

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

const addOriginId = (value: string) => {
  try {
    const parsed = JSON.parse(value)
    if (!isRecord(parsed)) return value
    return JSON.stringify({ ...parsed, originId: SETTINGS_STORAGE_ORIGIN_ID })
  } catch {
    return value
  }
}

const parseStoredValue = (value: unknown) => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return null
  }
}

export const getStorageChangeOriginId = (change: unknown) => {
  if (!isRecord(change)) return null
  const parsed = parseStoredValue(change.newValue)
  if (!isRecord(parsed) || typeof parsed.originId !== 'string') return null
  return parsed.originId
}

export const originAwareLocalStorage = {
  getItem: (name: string) => extensionLocalStorage.getItem(name),
  setItem: (name: string, value: string) => extensionLocalStorage.setItem(name, addOriginId(value)),
  removeItem: (name: string) => extensionLocalStorage.removeItem(name),
}
