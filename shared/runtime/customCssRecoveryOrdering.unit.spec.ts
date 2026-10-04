import { createStore } from 'jotai/vanilla'
import { describe, expect, it, vi } from 'vitest'
import type { ChatCssCustomization } from '@/shared/settings/customCss'
import {
  appliedChatCssAtom,
  customCssAtom,
  customCssFeedbackAtom,
  customCssLocalStopAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  isCustomCssStoppedAtom,
  receiveCustomCssSuspendedAtom,
} from '@/shared/state/customCssAtoms'
import { createCustomCssActions } from './customCssActions'

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: Error) => void
  const promise = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

const setup = () => {
  const store = createStore()
  store.set(customCssAtom, { enabled: true, css: '.source{}' })
  store.set(customCssSuspendedAtom, true)
  let disposed = false
  const repository = {
    saveCustomCss: vi.fn(async (value: ChatCssCustomization) => {
      store.set(customCssAtom, value)
    }),
    saveSavedChatCss: vi.fn(async () => {}),
    saveCustomCssSuspended: vi.fn(async (value: boolean) => {
      store.set(receiveCustomCssSuspendedAtom, value)
    }),
  }
  const actions = createCustomCssActions(store, repository, () => disposed)
  return {
    store,
    repository,
    actions,
    dispose: () => {
      disposed = true
    },
  }
}

describe('stops superseding pending CSS recovery', () => {
  it.each(['activate', 'recovery'])('blocks a late resume readback before and after %s settles', async command => {
    const { store, repository, actions } = setup()
    const resume = deferred()
    repository.saveCustomCssSuspended.mockImplementationOnce(() => resume.promise)
    const pending = command === 'activate' ? actions.activate('.source{}', store.get(customCssAtom)) : actions.suspend(false)
    await vi.waitFor(() => expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(false))
    const request = store.get(customCssRecoveryAtom)

    store.set(receiveCustomCssSuspendedAtom, true)
    expect(store.get(customCssRecoveryAtom)).toBe(request)
    store.set(receiveCustomCssSuspendedAtom, false)
    // This assertion precedes Promise completion: CSS must never flash on.
    expect(store.get(appliedChatCssAtom)).toBe('')
    resume.resolve()
    await pending
    expect(store.get(appliedChatCssAtom)).toBe('')
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: true })
    expect(store.get(customCssFeedbackAtom)).toBeNull()
    expect(store.get(customCssOperationAtom)).toBeNull()

    await actions.suspend(true)
    expect(store.get(customCssLocalStopAtom)).toBe(false)
    expect(store.get(customCssRecoveryAtom).failed).toBe(false)
    await actions.activate('.source{}', store.get(customCssAtom))
    expect(store.get(appliedChatCssAtom)).toBe('.source{}')
  })

  it.each(['resolve', 'reject'])('keeps external Off without claiming confirmation after the obsolete resume will %s', async outcome => {
    const { store, repository, actions } = setup()
    const resume = deferred()
    repository.saveCustomCssSuspended.mockImplementationOnce(() => resume.promise)
    const pending = actions.activate('.source{}', store.get(customCssAtom))
    await vi.waitFor(() => expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(false))
    store.set(receiveCustomCssSuspendedAtom, true)
    if (outcome === 'resolve') resume.resolve()
    else resume.reject(new Error('obsolete resume failure'))
    await expect(pending).resolves.toBeUndefined()
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: outcome === 'reject' })
    expect(store.get(customCssFeedbackAtom)).toBeNull()
    expect(store.get(customCssLocalStopAtom)).toBe(outcome === 'reject')
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    await actions.suspend(false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(false)
  })

  it.each([false, true])('does not replace the result of a later local Off (failed=%s) with an older resume error', async failed => {
    const { store, repository, actions } = setup()
    const resume = deferred()
    repository.saveCustomCssSuspended.mockImplementationOnce(() => resume.promise)
    const pending = actions.activate('.source{}', store.get(customCssAtom))
    await vi.waitFor(() => expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(false))
    if (failed) repository.saveCustomCssSuspended.mockRejectedValueOnce(new Error('current stop failure'))
    const stop = actions.suspend(true)
    if (failed) await expect(stop).rejects.toThrow('current stop failure')
    else await stop
    const latest = store.get(customCssRecoveryAtom)
    resume.reject(new Error('obsolete resume failure'))
    await expect(pending).resolves.toBeUndefined()
    expect(store.get(customCssRecoveryAtom)).toBe(latest)
    expect(store.get(customCssFeedbackAtom)).toBeNull()
    expect(store.get(customCssOperationAtom)).toBeNull()
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
  })

  it('still reports a current resume failure', async () => {
    const { store, repository, actions } = setup()
    repository.saveCustomCssSuspended.mockRejectedValueOnce(new Error('current resume failure'))
    await expect(actions.activate('.source{}', store.get(customCssAtom))).rejects.toThrow('current resume failure')
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: false, failed: true })
    expect(store.get(customCssFeedbackAtom)).toEqual({ kind: 'error', operation: 'apply', code: 'storage' })
  })

  it('does not reconcile a superseded resume after disposal', async () => {
    const { store, repository, actions, dispose } = setup()
    const resume = deferred()
    repository.saveCustomCssSuspended.mockImplementationOnce(() => resume.promise)
    const pending = actions.suspend(false)
    store.set(receiveCustomCssSuspendedAtom, true)
    const latest = store.get(customCssRecoveryAtom)
    dispose()
    resume.resolve()
    await expect(pending).rejects.toThrow('disposed')
    expect(store.get(customCssRecoveryAtom)).toBe(latest)
    expect(store.get(customCssLocalStopAtom)).toBe(true)
  })
})
