import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSettingsRepository, type SettingsRepository } from '@/shared/settings/repository'
import { APPEARANCE_STORAGE_KEY } from '@/shared/settings/storageKeys'
import { chatSettingsStateAtom, EMPTY_MESSAGES } from '@/shared/state/atoms'
import { commitStylePatchAtom } from '@/shared/state/commands'
import { type AppRuntime, createAppRuntime } from './createAppRuntime'

const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(next => {
    resolve = next
  })
  return { promise, resolve }
}

let runtime: AppRuntime | undefined
let repository: SettingsRepository | undefined
const releases: (() => void)[] = []
beforeEach(async () => {
  await chrome.storage.local.clear()
})
afterEach(async () => {
  for (const release of releases.splice(0)) release()
  await repository?.flush().catch(() => {})
  runtime?.dispose()
  runtime = undefined
  repository = undefined
  vi.restoreAllMocks()
})

describe('import completion before popup closure', () => {
  it('waits for a later queued edit without making that edit wait on itself', async () => {
    repository = createSettingsRepository('completion-editor', null, { waitBeforeRetry: async () => {} })
    runtime = await createAppRuntime(repository, { loadMessages: async () => EMPTY_MESSAGES })
    const importStarted = deferred()
    const releaseImport = deferred()
    const editStarted = deferred()
    const releaseEdit = deferred()
    releases.push(releaseImport.resolve, releaseEdit.resolve)
    const originalSet = chrome.storage.local.set.bind(chrome.storage.local)
    vi.spyOn(chrome.storage.local, 'set').mockImplementation(async values => {
      if (Object.keys(values).length === 4) {
        importStarted.resolve()
        await releaseImport.promise
      } else if (APPEARANCE_STORAGE_KEY in values) {
        editStarted.resolve()
        await releaseEdit.promise
      }
      await originalSet(values)
    })
    let completed = false
    const importing = runtime.importSettings(runtime.exportSettings()).then(() => {
      completed = true
    })
    await importStarted.promise
    runtime.store.set(commitStylePatchAtom, { appearance: { fontSize: 34 } })
    releaseImport.resolve()
    await editStarted.promise
    expect(completed).toBe(false)

    releaseEdit.resolve()
    await importing
    expect(completed).toBe(true)
    expect(runtime.store.get(chatSettingsStateAtom).profile.appearance.fontSize).toBe(34)
    expect((await repository.load()).chat.profile.appearance.fontSize).toBe(34)
  })
})
