import { createStore } from 'jotai/vanilla'
import { describe, expect, it, vi } from 'vitest'
import type { ChatCssCustomization } from '@/shared/settings/customCss'
import {
  customCssAtom,
  customCssFeedbackAtom,
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
const setup = (paused = true) => {
  const store = createStore()
  store.set(customCssAtom, { enabled: true, css: '.old{}' })
  store.set(customCssSuspendedAtom, paused)
  const repository = {
    saveCustomCss: vi.fn(async (value: ChatCssCustomization) => {
      store.set(customCssAtom, value)
    }),
    saveSavedChatCss: vi.fn(async () => {}),
    saveCustomCssSuspended: vi.fn(async (value: boolean) => {
      store.set(receiveCustomCssSuspendedAtom, value)
    }),
  }
  const actions = createCustomCssActions(store, repository, () => false)
  return { store, repository, actions }
}

describe('explicitly using a selected CSS source', () => {
  it('confirms the selected source before lifting a pause and holds the action lock throughout', async () => {
    const { store, repository, actions } = setup()
    const write = deferred()
    repository.saveCustomCss.mockImplementationOnce(async value => {
      await write.promise
      store.set(customCssAtom, value)
    })
    repository.saveCustomCssSuspended.mockImplementationOnce(async value => {
      expect(store.get(customCssAtom)).toEqual({ enabled: true, css: '.selected{}' })
      expect(store.get(customCssOperationAtom)).toBe('apply')
      store.set(receiveCustomCssSuspendedAtom, value)
    })
    const using = actions.activate('.selected{}', store.get(customCssAtom))
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
    await expect(actions.register('Copy', '.copy{}')).rejects.toThrow('busy')
    write.resolve()
    await using
    expect(repository.saveCustomCssSuspended).toHaveBeenCalledTimes(1)
    expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(false)
    expect(store.get(isCustomCssStoppedAtom)).toBe(false)
    expect(store.get(customCssOperationAtom)).toBeNull()
    expect(store.get(customCssFeedbackAtom)).toEqual({ kind: 'success', operation: 'apply' })
  })

  it('does not resume if the source write fails or its confirmation is missing', async () => {
    for (const unreadable of [false, true]) {
      const { store, repository, actions } = setup()
      if (unreadable) repository.saveCustomCss.mockResolvedValueOnce(undefined)
      else repository.saveCustomCss.mockRejectedValueOnce(new Error('unavailable'))
      await expect(actions.activate('.new{}', store.get(customCssAtom))).rejects.toThrow()
      expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
      expect(store.get(isCustomCssStoppedAtom)).toBe(true)
      expect(store.get(customCssOperationAtom)).toBeNull()
    }
  })

  it('keeps the confirmed source when resume fails, so the next explicit use can retry it', async () => {
    const { store, repository, actions } = setup()
    repository.saveCustomCssSuspended.mockRejectedValueOnce(new Error('resume unavailable'))
    await expect(actions.activate('.new{}', store.get(customCssAtom))).rejects.toThrow('resume unavailable')
    expect(store.get(customCssAtom)).toEqual({ enabled: true, css: '.new{}' })
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: false, failed: true })
    await actions.activate('.new{}', store.get(customCssAtom))
    expect(store.get(isCustomCssStoppedAtom)).toBe(false)
    expect(store.get(customCssRecoveryAtom).failed).toBe(false)
  })

  it.each([false, true])('does not resume after a later local Off while initially paused=%s', async paused => {
    const { store, repository, actions } = setup(paused)
    const write = deferred()
    repository.saveCustomCss.mockImplementationOnce(async value => {
      await write.promise
      store.set(customCssAtom, value)
    })
    const using = actions.activate('.new{}', store.get(customCssAtom))
    await actions.suspend(true)
    write.resolve()
    await using
    expect(repository.saveCustomCssSuspended).toHaveBeenCalledTimes(1)
    expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(true)
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    expect(store.get(customCssFeedbackAtom)).toBeNull()
  })

  it('observes a repeated external Off even when the confirmed pause was already true', async () => {
    const { store, repository, actions } = setup()
    const write = deferred()
    repository.saveCustomCss.mockImplementationOnce(async value => {
      await write.promise
      store.set(customCssAtom, value)
    })
    const using = actions.activate('.new{}', store.get(customCssAtom))
    store.set(receiveCustomCssSuspendedAtom, true)
    write.resolve()
    await using
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
  })

  it('allows Off during an in-flight resume and does not clear the newer local stop', async () => {
    const { store, repository, actions } = setup()
    const resume = deferred()
    repository.saveCustomCssSuspended.mockImplementationOnce(async value => {
      await resume.promise
      store.set(receiveCustomCssSuspendedAtom, value)
    })
    // Model the later Off as a failed write: the previous resume readback must
    // not clear that local safety latch, even though the stored value is false.
    repository.saveCustomCssSuspended.mockRejectedValueOnce(new Error('off unavailable'))
    const using = actions.activate('.new{}', store.get(customCssAtom))
    await vi.waitFor(() => expect(repository.saveCustomCssSuspended).toHaveBeenCalledWith(false))
    await expect(actions.suspend(true)).rejects.toThrow('off unavailable')
    resume.resolve()
    await using
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
    expect(store.get(customCssRecoveryAtom)).toEqual({ pending: false, target: true, failed: true })
    expect(store.get(customCssFeedbackAtom)).toBeNull()
  })

  it('rejects a stale editing baseline before either write', async () => {
    const { repository, actions } = setup()
    await expect(actions.activate('.new{}', { enabled: false, css: '.stale{}' })).rejects.toThrow('conflict')
    expect(repository.saveCustomCss).not.toHaveBeenCalled()
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
  })

  it('keeps ordinary Apply separate from explicit Use/Resume', async () => {
    const { store, repository, actions } = setup()
    await actions.apply('.new{}', store.get(customCssAtom))
    expect(repository.saveCustomCssSuspended).not.toHaveBeenCalled()
    expect(store.get(isCustomCssStoppedAtom)).toBe(true)
  })
})
