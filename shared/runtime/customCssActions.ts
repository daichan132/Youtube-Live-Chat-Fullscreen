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
  type CustomCssOperation,
  savedChatCssAtom,
} from '@/shared/state/customCssAtoms'

export type CustomCssActions = {
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
  const run = async (operation: CustomCssOperation, action: () => Promise<void>) => {
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
      await action()
      requireActive()
      store.set(customCssFeedbackAtom, { kind: 'success', operation })
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

  return {
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
      // A stop must still be possible during a save or pending resume. A
      // second resume, however, must not bypass those operations.
      if (!suspended && (recovery.pending || store.get(customCssOperationAtom) !== null)) throw new CustomCssError('busy')
      if (suspended) store.set(customCssLocalStopAtom, true)
      const request = { pending: true, target: suspended, failed: false }
      store.set(customCssRecoveryAtom, request)
      try {
        await repository.saveCustomCssSuspended(suspended)
        requireActive()
        if (store.get(customCssRecoveryAtom) !== request) return
        confirm(store.get(customCssSuspendedAtom) === suspended)
        store.set(customCssLocalStopAtom, false)
        store.set(customCssRecoveryAtom, { pending: false, target: suspended, failed: false })
      } catch (error) {
        if (!isDisposed() && store.get(customCssRecoveryAtom) === request) {
          store.set(customCssRecoveryAtom, { pending: false, target: suspended, failed: true })
        }
        throw error
      }
    },
  }
}
