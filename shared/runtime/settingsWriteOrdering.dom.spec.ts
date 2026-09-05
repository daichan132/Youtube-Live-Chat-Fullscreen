import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { chatSettingsStateAtom, EMPTY_MESSAGES } from '@/shared/state/atoms'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

let runtime: AppRuntime | undefined
let releaseSave: (() => void) | undefined
let saving: Promise<void> | undefined

beforeEach(async () => {
  await chrome.storage.local.clear()
})

afterEach(async () => {
  releaseSave?.()
  try {
    await saving
  } catch {
    // A failing assertion must still release and dispose the real repository.
  } finally {
    runtime?.dispose()
    runtime = undefined
    releaseSave = undefined
    saving = undefined
    vi.restoreAllMocks()
  }
})

describe('committed settings ordering', () => {
  it('accepts the local readback when an external event preceded the local storage commit', async () => {
    const repository = createSettingsRepository('local-editor', null, { waitBeforeRetry: async () => {} })
    runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
    const store = runtime.store
    const current = store.get(chatSettingsStateAtom)
    const localProfile = { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 24 } }
    const externalProfile = { ...current.profile, appearance: { ...current.profile.appearance, fontSize: 32 } }
    const started = deferred()
    const release = deferred()
    releaseSave = release.resolve
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      started.resolve()
      await release.promise
      await originalSet(values)
    })

    saving = repository.saveAppearance({ profile: localProfile, presets: current.presets })
    await started.promise
    // Bypass the delayed local writer to choose the external-before-local
    // commit order. Both contexts still use real Storage notifications.
    await originalSet({
      [APPEARANCE_STORAGE_KEY]: {
        schemaVersion: 1,
        writerId: 'external-editor',
        value: { profile: externalProfile, presets: current.presets },
      },
    })
    await vi.waitFor(() => expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(32))
    release.resolve()
    await saving
    await repository.flush()

    expect(store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(24)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(24)
  })
})
