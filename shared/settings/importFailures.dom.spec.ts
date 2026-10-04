import { afterEach, expect, it, vi } from 'vitest'
import { DEFAULT_CHAT_SETTINGS } from './migrateSettings'
import { createSettingsRepository } from './repository'

const global = { ytdLiveChat: true, themeMode: 'system' as const }
afterEach(() => vi.restoreAllMocks())

it('identifies a failure before writing and never starts the bulk write', async () => {
  const repository = createSettingsRepository('phase-test', null, { waitBeforeRetry: async () => {} })
  const set = vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('offline'))
  await expect(repository.saveEnabled(false)).rejects.toThrow()
  set.mockClear()
  await expect(repository.replaceSettings(global, DEFAULT_CHAT_SETTINGS)).rejects.toMatchObject({ phase: 'before-write' })
  expect(set).not.toHaveBeenCalled()
})

it('distinguishes a bulk write failure from a readback failure', async () => {
  const repository = createSettingsRepository('phase-test', null)
  const set = vi.spyOn(chrome.storage.local, 'set').mockRejectedValueOnce(new Error('offline'))
  await expect(repository.replaceSettings(global, DEFAULT_CHAT_SETTINGS)).rejects.toMatchObject({ phase: 'write' })
  set.mockRestore()
  vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('read unavailable'))
  await expect(repository.replaceSettings(global, DEFAULT_CHAT_SETTINGS)).rejects.toMatchObject({ phase: 'readback' })
})

it('reports later save failure without treating the completed import as unwritten', async () => {
  const repository = createSettingsRepository('phase-test', null, { waitBeforeRetry: async () => {} })
  const original = chrome.storage.local.set.bind(chrome.storage.local)
  vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
    if (Object.keys(values).length === 1) throw new Error('later edit failed')
    return original(values)
  })
  const imported = repository.replaceSettings(global, DEFAULT_CHAT_SETTINGS)
  const later = repository.saveEnabled(false)
  await expect(later).rejects.toThrow()
  await expect(imported).rejects.toMatchObject({ phase: 'following-write' })
})
