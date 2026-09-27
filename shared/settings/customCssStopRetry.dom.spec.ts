import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LocaleMessages } from '@/shared/i18n/generated/translationTypes'
import { createAppRuntime, type AppRuntime } from '@/shared/runtime/createAppRuntime'
import {
  customCssLocalStopAtom,
  customCssRecoveryAtom,
  isCustomCssStoppedAtom,
} from '@/shared/state/customCssAtoms'
import { createSettingsRepository } from './repository'
import { CUSTOM_CSS_SUSPENDED_STORAGE_KEY } from './storageKeys'

const runtimes: AppRuntime[] = []
beforeEach(async () => { await chrome.storage.local.clear() })
afterEach(() => {
  runtimes.splice(0).forEach(runtime => { runtime.dispose() })
  vi.restoreAllMocks()
})
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(yes => { resolve = yes })
  return { promise, resolve }
}
const open = async () => {
  const repository = createSettingsRepository('stop-retry', null, { waitBeforeRetry: async () => {} })
  const runtime = await createAppRuntime(repository, { loadMessages: async () => ({}) as LocaleMessages })
  runtimes.push(runtime)
  await runtime.customCss.suspend(true)
  return { runtime, repository }
}

const externalStop = {
  [CUSTOM_CSS_SUSPENDED_STORAGE_KEY]: { schemaVersion: 1, writerId: 'other-page', value: true },
}

describe('obsolete resume retries', () => {
  it('does not requeue a resume if Off arrived before its failed readback started', async () => {
    const { runtime, repository } = await open()
    const entered = deferred()
    const release = deferred()
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    const write = vi.spyOn(chrome.storage.local, 'set').mockImplementationOnce(async values => {
      entered.resolve()
      await release.promise
      await originalSet(values)
    })
    const pending = runtime.customCss.suspend(false)
    await entered.promise
    await originalSet(externalStop)
    await vi.waitFor(() => expect(runtime.store.get(customCssLocalStopAtom)).toBe(true))
    const read = vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('read unavailable'))
    release.resolve()
    await pending
    read.mockRestore()
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
    await runtime.retryPersistence()
    expect(write).toHaveBeenCalledTimes(1)
    expect(runtime.store.get(isCustomCssStoppedAtom)).toBe(true)
    expect(runtime.store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: true })
    // The late write did reach storage: do not present the earlier stop as
    // confirmed. An explicit stop retry restores the persisted preference.
    expect((await repository.load()).customCssSuspended).toBe(false)
    await runtime.customCss.suspend(true)
    expect((await repository.load()).customCssSuspended).toBe(true)
    expect(runtime.store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: false })
  })

  it('does not requeue a resume if Off arrived during its failed readback', async () => {
    const { runtime, repository } = await open()
    let rejectRead!: (error: Error) => void
    const read = vi.spyOn(chrome.storage.local, 'get').mockImplementationOnce(() => new Promise<Record<string, unknown>>((_yes, no) => {
      rejectRead = no
    }))
    const pending = runtime.customCss.suspend(false)
    await vi.waitFor(() => expect(rejectRead).toBeDefined())
    await chrome.storage.local.set(externalStop)
    await vi.waitFor(() => expect(runtime.store.get(customCssLocalStopAtom)).toBe(true))
    rejectRead(new Error('read unavailable'))
    await pending
    read.mockRestore()
    const write = vi.spyOn(chrome.storage.local, 'set')
    await runtime.retryPersistence()
    expect(write).not.toHaveBeenCalled()
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
    expect(runtime.store.get(isCustomCssStoppedAtom)).toBe(true)
  })

  it('keeps a current unreadable resume retryable', async () => {
    const { runtime, repository } = await open()
    const read = vi.spyOn(chrome.storage.local, 'get').mockRejectedValue(new Error('read unavailable'))
    await expect(runtime.customCss.suspend(false)).rejects.toThrow('unconfirmed')
    expect(repository.getPersistenceStatus()).toEqual({ status: 'error', failedDomains: ['customCssSuspended'] })
    read.mockRestore()
    await runtime.retryPersistence()
    expect(runtime.store.get(isCustomCssStoppedAtom)).toBe(false)
    expect(runtime.store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: false, failed: false })
    expect(repository.getPersistenceStatus()).toEqual({ status: 'idle', failedDomains: [] })
  })
})
