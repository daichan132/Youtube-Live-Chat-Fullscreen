import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { createAppRuntime, type AppRuntime } from '@/shared/runtime/createAppRuntime'
import {
  customCssAtom,
  customCssFeedbackAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  isCustomCssStoppedAtom,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'
import { createSettingsRepository } from './repository'
import { CUSTOM_CSS_STORAGE_KEY } from './storageKeys'

const runtimes: AppRuntime[] = []
beforeEach(async () => { await chrome.storage.local.clear() })
afterEach(() => {
  runtimes.splice(0).forEach(runtime => { runtime.dispose() })
  vi.restoreAllMocks()
})
const open = async () => {
  const repository = createSettingsRepository('acknowledgement', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => ({}) as LocaleMessages })
  runtimes.push(runtime)
  return { runtime, repository }
}
const failReadback = () => vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('read unavailable'))

describe('unconfirmed CSS persistence', () => {
  it('keeps an unreadable applied write in Retry and rejects flush until it is confirmed', async () => {
    const { runtime, repository } = await open()
    const read = failReadback()
    await expect(runtime.customCss.apply('.source{}', runtime.store.get(customCssAtom))).rejects.toThrow('unconfirmed')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['customCss'] })
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: false, css: '' })
    await expect(repository.flush()).rejects.toThrow('unconfirmed')
    read.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: true, css: '.source{}' })
    expect(runtime.store.get(customCssFeedbackAtom)).toBeNull()
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
  })

  it('retries the same saved registration rather than allocating another ID', async () => {
    const { runtime, repository } = await open()
    const read = failReadback()
    await expect(runtime.customCss.register('Saved', '.source{}')).rejects.toThrow('unconfirmed')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['savedChatCss'] })
    read.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(savedChatCssAtom)).toMatchObject([{ name: 'Saved', css: '.source{}' }])
    expect(runtime.store.get(savedChatCssAtom)).toHaveLength(1)
    expect(runtime.store.get(customCssFeedbackAtom)).toBeNull()
  })

  it('reconciles an unconfirmed pause through the common Retry', async () => {
    const { runtime, repository } = await open()
    const read = failReadback()
    await expect(runtime.customCss.suspend(true)).rejects.toThrow('unconfirmed')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['customCssSuspended'] })
    expect(runtime.store.get(customCssSuspendedAtom)).toBe(false)
    expect(runtime.store.get(isCustomCssStoppedAtom)).toBe(true)
    read.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(customCssSuspendedAtom)).toBe(true)
    expect(runtime.store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: false })
  })

  it('lets a disable supersede an unreadable enabling write', async () => {
    const { runtime, repository } = await open()
    const read = failReadback()
    await expect(runtime.customCss.apply('.source{}', runtime.store.get(customCssAtom))).rejects.toThrow('unconfirmed')
    read.mockRestore()
    await runtime.customCss.disable()
    await runtime.retryPersistence()
    const snapshot = await repository.load()
    expect(snapshot.customCss).toEqual({ enabled: false, css: '' })
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
  })

  it('does not replay a failed disable after the user explicitly applies the original CSS again', async () => {
    const { runtime, repository } = await open()
    await runtime.customCss.apply('.source{}', runtime.store.get(customCssAtom))
    const write = vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('write unavailable'))
    await expect(runtime.customCss.disable()).rejects.toThrow('write unavailable')
    write.mockRestore()
    await runtime.customCss.apply('.source{}', runtime.store.get(customCssAtom))
    await runtime.retryPersistence()
    expect((await repository.load()).customCss).toEqual({ enabled: true, css: '.source{}' })
  })

  it('keeps malformed readbacks retryable instead of reporting idle', async () => {
    const { runtime, repository } = await open()
    const originalGet = chrome.storage.local.get.bind(chrome.storage.local)
    const read = vi.spyOn(chrome.storage.local, 'get').mockImplementation(async keys => {
      const values = await originalGet(keys)
      if (CUSTOM_CSS_STORAGE_KEY in values) {
        values[CUSTOM_CSS_STORAGE_KEY] = { schemaVersion: 1, writerId: 'acknowledgement', value: { enabled: true, css: 123 } }
      }
      return values
    })
    await expect(runtime.customCss.apply('.source{}', runtime.store.get(customCssAtom))).rejects.toThrow('unconfirmed')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['customCss'] })
    read.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(customCssAtom)).toEqual({ enabled: true, css: '.source{}' })
  })

  it('does not enqueue an obsolete retry if another page commits during the failed readback', async () => {
    const { runtime, repository } = await open()
    let rejectRead: ((error: Error) => void) | undefined
    const read = vi.spyOn(chrome.storage.local, 'get').mockImplementationOnce(() => new Promise<Record<string, unknown>>((_resolve, reject) => {
      rejectRead = reject
    }))
    const pending = runtime.customCss.apply('.older{}', runtime.store.get(customCssAtom))
    const rejected = expect(pending).rejects.toThrow('unconfirmed')
    await vi.waitFor(() => expect(rejectRead).toBeDefined())
    const external = { enabled: false, css: '.newer{}' }
    await chrome.storage.local.set({
      [CUSTOM_CSS_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-page', value: external },
    })
    await vi.waitFor(() => expect(runtime.store.get(customCssAtom)).toEqual(external))
    rejectRead?.(new Error('read unavailable'))
    await rejected
    read.mockRestore()
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
    await runtime.retryPersistence()
    expect((await repository.load()).customCss).toEqual(external)
  })
})
