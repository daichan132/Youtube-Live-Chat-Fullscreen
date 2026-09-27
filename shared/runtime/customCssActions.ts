import type { Store } from 'jotai/vanilla/store'
import {
  areCustomCssEqual,
  areSavedChatCssEqual,
  assertCustomCss,
  assertSavedChatCss,
  type ChatCssCustomization,
  CustomCssError,
  MAX_CSS_NAME_LENGTH,
  type SavedChatCss,
} from '@/shared/settings/customCss'
import type { SettingsRepository } from '@/shared/settings/repository'
import {
  customCssAtom,
  customCssFeedbackAtom,
  customCssLocalStopAtom,
  customCssOperationAtom,
  customCssRecoveryAtom,
  customCssSuspendedAtom,
  customCssStopVersionAtom,
  isCustomCssStoppedAtom,
  type CustomCssOperation,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'

export type CustomCssActions = {
  activate(css: string, expected: ChatCssCustomization): Promise<void>
  apply(css: string, expected: ChatCssCustomization): Promise<void>
  disable(): Promise<void>
  register(name: string, css: string): Promise<void>
  remove(expected: SavedChatCss): Promise<void>
  suspend(suspended: boolean): Promise<void>
}

export const createCustomCssActions = (
  store: Store,
  repository: Pick<SettingsRepository, 'saveCustomCss' | 'saveSavedChatCss' | 'saveCustomCssSuspended'>,
  isDisposed: () => boolean,
): CustomCssActions => {
  const requireActive = () => {
    if (isDisposed()) throw new Error('App runtime has been disposed')
  }
  const confirm = (matches: boolean) => {
    requireActive()
    // A write may have succeeded without a readback, or been superseded.
    // Do not install the submitted snapshot over a newer watched commit.
    if (!matches) throw new CustomCssError('unconfirmed')
  }
  const run = async (operation: CustomCssOperation, action: () => Promise<void | boolean>) => {
    requireActive()
    // The action boundary owns the lock, not a mounted UI instance. Two
    // registrations must not both append to the same outdated list. A pending
    // resume must not race with an Apply presented as a save-while-paused.
    if (store.get(customCssOperationAtom) !== null || store.get(customCssRecoveryAtom).pending) {
      throw new CustomCssError('busy')
    }
    store.set(customCssOperationAtom, operation)
    store.set(customCssFeedbackAtom, null)
    try {
      const completed = await action()
      requireActive()
      if (completed !== false) store.set(customCssFeedbackAtom, { kind: 'success', operation })
    } catch (error) {
      if (!isDisposed()) {
        store.set(customCssFeedbackAtom, { kind: 'error', operation, code: error instanceof CustomCssError ? error.code : 'storage' })
      }
      throw error
    } finally {
      if (!isDisposed()) store.set(customCssOperationAtom, null)
    }
  }
  const saveActive = async (value: ChatCssCustomization) => {
    assertCustomCss(value)
    await repository.saveCustomCss(value)
    confirm(areCustomCssEqual(store.get(customCssAtom), value))
  }
  const saveLibrary = async (value: SavedChatCss[]) => {
    assertSavedChatCss(value)
    await repository.saveSavedChatCss(value)
    confirm(areSavedChatCssEqual(store.get(savedChatCssAtom), value))
  }

  const persistSuspension = async (suspended: boolean) => {
    if (suspended) store.set(customCssLocalStopAtom, true)
    const stopVersion = store.get(customCssStopVersionAtom)
    const request = { pending: true, target: suspended, failed: false }
    store.set(customCssRecoveryAtom, request)
    const settleSupersededRequest = (writeFailed: boolean) => {
      if (store.get(customCssRecoveryAtom) !== request) return true
      if (suspended || store.get(customCssStopVersionAtom) === stopVersion) return false
      // An external Off has the same priority as a later local Off. Its latch
      // already blocks late resume readbacks. A failed write/readback cannot
      // establish that storage still contains the previously observed stop.
      const unconfirmed = writeFailed || !store.get(customCssSuspendedAtom)
      store.set(customCssLocalStopAtom, unconfirmed)
      store.set(customCssRecoveryAtom, { pending: false, target: true, failed: unconfirmed })
      return true
    }
    try {
      await repository.saveCustomCssSuspended(suspended)
      requireActive()
      if (settleSupersededRequest(false)) return false
      confirm(store.get(customCssSuspendedAtom) === suspended)
      store.set(customCssLocalStopAtom, false)
      store.set(customCssRecoveryAtom, { pending: false, target: suspended, failed: false })
      return true
    } catch (error) {
      if (isDisposed()) throw error
      // Superseded failures are not failures of the newer stop operation.
      if (settleSupersededRequest(true)) return false
      store.set(customCssRecoveryAtom, { pending: false, target: suspended, failed: true })
      throw error
    }
  }

  return {
    // Only this explicitly labelled Use/Resume command may lift the pause.
    // Plain Apply, saving a copy and importing settings never resume CSS.
    activate: (css, expected) => run('apply', async () => {
      if (!areCustomCssEqual(store.get(customCssAtom), expected)) throw new CustomCssError('conflict')
      if (!css.trim()) throw new CustomCssError('invalid')
      const stopVersion = store.get(customCssStopVersionAtom)
      const requested = { css, enabled: true }
      await saveActive(requested)
      // Off remains available while saving; never undo a newer stop, including
      // a repeated true notification from another settings page.
      if (store.get(customCssStopVersionAtom) !== stopVersion) return false
      confirm(areCustomCssEqual(store.get(customCssAtom), requested))
      if (store.get(isCustomCssStoppedAtom) || store.get(customCssRecoveryAtom).failed) {
        if (!(await persistSuspension(false))) return false
      }
      if (store.get(customCssStopVersionAtom) !== stopVersion || store.get(isCustomCssStoppedAtom)) return false
      confirm(areCustomCssEqual(store.get(customCssAtom), requested))
    }),
    apply: (css, expected) => run('apply', async () => {
      if (!areCustomCssEqual(store.get(customCssAtom), expected)) throw new CustomCssError('conflict')
      if (!css.trim()) throw new CustomCssError('invalid')
      await saveActive({ css, enabled: true })
      // Applying never resumes the independent emergency stop.
    }),
    disable: () => run('disable', () => saveActive({ ...store.get(customCssAtom), enabled: false })),
    register: (inputName, css) => run('register', async () => {
      const name = inputName.trim()
      if (!name || name.length > MAX_CSS_NAME_LENGTH || !css.trim()) throw new CustomCssError('invalid')
      const entries = store.get(savedChatCssAtom)
      if (entries.some(entry => entry.name.trim() === name)) throw new CustomCssError('duplicate-name')
      await saveLibrary([...entries, { id: crypto.randomUUID(), name, css }])
    }),
    remove: expected => run('remove', async () => {
      const entries = store.get(savedChatCssAtom)
      const current = entries.find(entry => entry.id === expected.id)
      if (!current || !areSavedChatCssEqual([current], [expected])) throw new CustomCssError('conflict')
      await saveLibrary(entries.filter(entry => entry.id !== expected.id))
    }),
    async suspend(suspended) {
      requireActive()
      const recovery = store.get(customCssRecoveryAtom)
      if (!suspended && (recovery.pending || store.get(customCssOperationAtom) !== null)) throw new CustomCssError('busy')
      if (suspended) store.set(customCssStopVersionAtom, store.get(customCssStopVersionAtom) + 1)
      await persistSuspension(suspended)
    },
  }
}
