import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { fakeBrowser } from 'wxt/testing/fake-browser'

type MessageListener = (message: unknown) => void
type StorageChangeListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void

const messageListeners = new Set<MessageListener>()

const onMessage = {
  addListener: vi.fn((listener: MessageListener) => {
    messageListeners.add(listener)
  }),
  removeListener: vi.fn((listener: MessageListener) => {
    messageListeners.delete(listener)
  }),
}

const runtime = {
  onMessage,
  __emitMessage: (message: unknown) => {
    messageListeners.forEach(listener => listener(message))
  },
  __listenerCount: () => messageListeners.size,
}

const storageData: Record<string, unknown> = {}
const storageChangeListeners = new Set<StorageChangeListener>()
const storageOnChanged = {
  addListener: vi.fn((listener: StorageChangeListener) => storageChangeListeners.add(listener)),
  removeListener: vi.fn((listener: StorageChangeListener) => storageChangeListeners.delete(listener)),
}
const storageLocal = {
  get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
    if (typeof keys === 'string') return { [keys]: storageData[keys] }
    if (Array.isArray(keys)) return Object.fromEntries(keys.map(key => [key, storageData[key]]))
    if (keys && typeof keys === 'object') return Object.fromEntries(Object.keys(keys).map(key => [key, storageData[key] ?? keys[key]]))
    return { ...storageData }
  }),
  set: vi.fn(async (values: Record<string, unknown>) => {
    const changes = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, { oldValue: storageData[key], newValue: value }]),
    ) as Record<string, chrome.storage.StorageChange>
    Object.assign(storageData, values)
    storageChangeListeners.forEach(listener => listener(changes, 'local'))
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const changes = Object.fromEntries(
      (typeof keys === 'string' ? [keys] : keys)
        .filter(key => key in storageData)
        .map(key => [key, { oldValue: storageData[key], newValue: undefined }]),
    ) as Record<string, chrome.storage.StorageChange>
    for (const key of typeof keys === 'string' ? [keys] : keys) delete storageData[key]
    storageChangeListeners.forEach(listener => listener(changes, 'local'))
  }),
  onChanged: storageOnChanged,
}

Object.assign(fakeBrowser.runtime, runtime)
Object.assign(fakeBrowser.storage.local, storageLocal)
vi.stubGlobal('chrome', fakeBrowser)
vi.stubGlobal('browser', fakeBrowser)

beforeEach(() => {
  for (const key of Object.keys(storageData)) delete storageData[key]
  messageListeners.clear()
  storageChangeListeners.clear()
  onMessage.addListener.mockClear()
  onMessage.removeListener.mockClear()
  storageOnChanged.addListener.mockClear()
  storageOnChanged.removeListener.mockClear()
})

afterEach(() => {
  cleanup()
})
